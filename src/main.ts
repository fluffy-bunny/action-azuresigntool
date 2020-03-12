import * as core from '@actions/core'
import * as crypto from 'crypto'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as github from '@actions/github'
import {wait} from './wait'

import {FormatType, SecretParser} from './secret-parser'

let azPath: string
const bAzureHttpUserAgent = !!process.env.AZURE_HTTP_USER_AGENT
const prefix = bAzureHttpUserAgent ? `${process.env.AZURE_HTTP_USER_AGENT}` : ''

async function run(): Promise<void> {
  try {
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)

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
async function executeAzCliCommand(command: string): Promise<void> {
  try {
    await exec.exec(`"${azPath}" ${command}`, [], {})
  } catch (error) {
    throw new Error(error)
  }
}

run()
