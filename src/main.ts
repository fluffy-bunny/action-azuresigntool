/* eslint-disable prefer-const */
import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as crypto from 'crypto'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as path from 'path'
//import * as util from 'util'

import {wait} from './wait'

import {FormatType, SecretParser} from './secret-parser'

const bAzureHttpUserAgent = !!process.env.AZURE_HTTP_USER_AGENT
const prefix = bAzureHttpUserAgent ? `${process.env.AZURE_HTTP_USER_AGENT}` : ''

const astProperties = [
  'du',
  'fd',
  'kvu',
  'kvi',
  'kvm',
  'kvs',
  'kvc',
  'tr',
  'td'
]

async function signFiles(): Promise<void> {
  const folder = core.getInput('folder', {required: true})
  const recursive = core.getInput('recursive') === 'true'
  const folderPath = path.dirname(folder)

  const azureSignToolAssembly = core.getInput('azure_sign_tool_assembly', {
    required: true
  })
  const azureSignToolAssemblyFullPath = await fs.realpath(azureSignToolAssembly)
  console.log(`azureSignToolAssemblyFullPath: ${azureSignToolAssemblyFullPath}`)
  await executeCliCommand('dotnet', `${azureSignToolAssemblyFullPath} sign -h`)

  console.log(
    `folder: ${folder}, recursive: ${recursive}, folderPath: ${folderPath}`
  )

  const azureSignToolCredentials = core.getInput(
    'azure_sign_tool_credentials',
    {required: true}
  )
  console.log(`azureSignToolCredentials:${azureSignToolCredentials}.`)
  const secretsAST = new SecretParser(azureSignToolCredentials, FormatType.JSON)
  const du = secretsAST.getSecret('$.du', false)
  console.log(`du:${du}.`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataSecretsAST: any = {}

  for (const prop of astProperties) {
    dataSecretsAST[prop] = secretsAST.getSecret(`$.${prop}`, false)
  }

  console.log(`dataSecretsAST:${JSON.stringify(dataSecretsAST, null, 4)}`)
  const pathFilesToSign = 'files/files-to-sign.txt'

  //await simpleFileWrite(pathFilesToSign, '')

  //await writeFilesToSign(pathFilesToSign, folder, recursive)

  let command: string
  const kvm = secretsAST.getSecret('$.kvm', false)
  if (kvm) {
    command = `${azureSignToolAssemblyFullPath} sign -du ${dataSecretsAST.du} -fd ${dataSecretsAST.fd} -kvu ${dataSecretsAST.kvu} -kvc ${dataSecretsAST.kvc} -tr ${dataSecretsAST.tr} -td ${dataSecretsAST.td} -v -ifl ${pathFilesToSign} -kvm`
  } else {
    command = `${azureSignToolAssemblyFullPath} sign -du ${dataSecretsAST.du} -fd ${dataSecretsAST.fd} -kvu ${dataSecretsAST.kvu} -kvc ${dataSecretsAST.kvc} -tr ${dataSecretsAST.tr} -td ${dataSecretsAST.td} -v -ifl ${pathFilesToSign} -kvi ${dataSecretsAST.kvi}  -kvs ${dataSecretsAST.kvs}`
  }

  console.log(`command:${command}`)
  await executeCliCommand('dotnet', `${command}`)
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
  } catch (error) {
    core.setFailed(error.message)
  }
}

/*
async function* getFiles(folder: string, recursive: boolean): any {
  const files = await fs.readdir(folder)
  for (const file of files) {
    const fullPath = `${folder}/${file}`
    const stat = await fs.stat(fullPath)
    if (stat.isFile()) {
      const extension = path.extname(file)
      if (
        signtoolFileExtensions.includes(extension) ||
        extension === '.nupkg'
      ) {
        yield fullPath
      }
    } else if (stat.isDirectory() && recursive) {
      yield* getFiles(fullPath, recursive)
    }
  }
}
*/

async function executeCliCommand(
  cliPath: string,
  command: string
): Promise<void> {
  try {
    await exec.exec(`"${cliPath}" ${command}`, [], {})
  } catch (error) {
    throw new Error(error)
  }
}
run()
