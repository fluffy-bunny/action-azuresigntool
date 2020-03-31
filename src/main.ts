/* eslint-disable prefer-const */
import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as crypto from 'crypto'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

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
  const azureSignToolAssembly = core.getInput('azure_sign_tool_assembly', {
    required: true
  })
  const azureSignToolAssemblyFullPath = await fs.realpath(azureSignToolAssembly)
  console.log(`azureSignToolAssemblyFullPath: ${azureSignToolAssemblyFullPath}`)
  await executeCliCommand('dotnet', `${azureSignToolAssemblyFullPath} sign -h`)

  const azureSignToolCredentials = core.getInput(
    'azure_sign_tool_credentials',
    {required: true}
  )
  console.log(`azureSignToolCredentials:${azureSignToolCredentials}.`)
  const secretsAST = new SecretParser(azureSignToolCredentials, FormatType.JSON)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataSecretsAST: any = {}

  for (const prop of astProperties) {
    dataSecretsAST[prop] = secretsAST.getSecret(`$.${prop}`, false)
  }

  console.log(`dataSecretsAST:${JSON.stringify(dataSecretsAST, null, 4)}`)
  //const filesToSign = 'files/files-to-sign.txt'

  const filesToSign = core.getInput('files_to_sign', {
    required: true
  })

  let command: string
  const kvm = secretsAST.getSecret('$.kvm', false)
  if (kvm) {
    // kvm == Use ManagedIdentity
    core.info(`Signing using Managed Identity.`)
    command = `${azureSignToolAssemblyFullPath} sign -du ${dataSecretsAST.du} -fd ${dataSecretsAST.fd} -kvu ${dataSecretsAST.kvu} -kvc ${dataSecretsAST.kvc} -tr ${dataSecretsAST.tr} -td ${dataSecretsAST.td} -v -ifl ${filesToSign} -kvm`
  } else {
    core.info(`Signing using client_credentials.`)
    command = `${azureSignToolAssemblyFullPath} sign -du ${dataSecretsAST.du} -fd ${dataSecretsAST.fd} -kvu ${dataSecretsAST.kvu} -kvc ${dataSecretsAST.kvc} -tr ${dataSecretsAST.tr} -td ${dataSecretsAST.td} -v -ifl ${filesToSign} -kvi ${dataSecretsAST.kvi}  -kvs ${dataSecretsAST.kvs}`
  }

  console.log(`command:${command}`)
  await executeCliCommand('dotnet', `${command}`)
}

async function run(): Promise<void> {
  try {
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)

    // Set user agent varable
    const hash = crypto.createHash('sha256')
    const update = hash.update(`${process.env.GITHUB_REPOSITORY}`)
    const usrAgentRepo = update.digest('hex')
    const actionName = 'AzureSignTool'

    const bPrefix = !!prefix
    const sPrefix = bPrefix ? `${prefix}+` : ''
    const userAgentString = `${sPrefix}GITHUBACTIONS_${actionName}_${usrAgentRepo}`
    core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString)
    console.log(`userAgentString:${userAgentString}.`)
    await signFiles()
  } catch (error) {
    core.setFailed(error.message)
  }
}

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
