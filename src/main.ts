import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as crypto from 'crypto'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as github from '@actions/github'
import * as path from 'path'
import * as util from 'util'

import {wait} from './wait'

import {FormatType, SecretParser} from './secret-parser'

let azPath: string
const bAzureHttpUserAgent = !!process.env.AZURE_HTTP_USER_AGENT
const prefix = bAzureHttpUserAgent ? `${process.env.AZURE_HTTP_USER_AGENT}` : ''

const signtoolFileExtensions = [
  '.dll',
  '.exe',
  '.sys',
  '.vxd',
  '.msix',
  '.msixbundle',
  '.appx',
  '.appxbundle',
  '.msi',
  '.msp',
  '.msm',
  '.cab',
  '.ps1',
  '.psm1'
]
async function signFiles(): Promise<void> {
  const folder = core.getInput('folder', {required: true})
  const recursive = core.getInput('recursive') === 'true'

  console.log(`folder: ${folder}, recursive: ${recursive}`)
  const iterator = getFiles(folder, recursive)

  for (const file of iterator) {
    console.log(file)
  }
}

async function run(): Promise<void> {
  try {
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)
    await signFiles()

    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`)

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    core.setOutput('time', new Date().toTimeString())
    // Set user agent varable
    const hash = crypto.createHash('sha256')
    const update = hash.update(`${process.env.GITHUB_REPOSITORY}`)
    const usrAgentRepo = update.digest('hex')
    const actionName = 'AzureLogin'

    const bPrefix = !!prefix
    const sPrefix = bPrefix ? `${prefix}+` : ''
    const userAgentString = `${sPrefix}GITHUBACTIONS_${actionName}_${usrAgentRepo}`
    core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString)
    console.log(`userAgentString:${userAgentString}.`)

    azPath = await io.which('az', true)
    console.log(`azPath:${azPath}.`)
    await executeAzCliCommand('--version')

    const creds = core.getInput('creds', {required: true})
    console.log(`creds:${creds}.`)

    const secrets = new SecretParser(creds, FormatType.JSON)

    const servicePrincipalId = secrets.getSecret('$.clientId', false)
    const servicePrincipalKey = secrets.getSecret('$.clientSecret', true)
    const tenantId = secrets.getSecret('$.tenantId', false)
    const subscriptionId = secrets.getSecret('$.subscriptionId', false)
    if (
      !servicePrincipalId ||
      !servicePrincipalKey ||
      !tenantId ||
      !subscriptionId
    ) {
      throw new Error(
        'Not all values are present in the creds object. Ensure clientId, clientSecret, tenantId and subscriptionId are supplied.'
      )
    }

    await executeAzCliCommand(
      `login --service-principal -u "${servicePrincipalId}" -p "${servicePrincipalKey}" --tenant "${tenantId}"`
    )
    await executeAzCliCommand(`account set --subscription "${subscriptionId}"`)
    console.log('Login successful.')
  } catch (error) {
    core.setFailed(error.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function* getFiles(folder: string, recursive: boolean): any {
  const files = await fs.readdir(folder)
  for (const file of files) {
    const fullPath = `${folder}/${file}`
    const stat = await fs.stat(fullPath)
    if (stat.isFile()) {
      const extension = path.extname(file)
      if (signtoolFileExtensions.includes(extension) || extension === '.nupkg')
        yield fullPath
    } else if (stat.isDirectory() && recursive) {
      yield* getFiles(fullPath, recursive)
    }
  }
}
async function executeAzCliCommand(command: string): Promise<void> {
  try {
    await exec.exec(`"${azPath}" ${command}`, [], {})
  } catch (error) {
    throw new Error(error)
  }
}

run()
