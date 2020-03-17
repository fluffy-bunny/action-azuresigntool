import {wait}                     from '../src/wait'
import {FormatType, SecretParser} from '../src/secret-parser'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'


test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  var delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_MILLISECONDS'] = '500'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
 // console.log(cp.execSync(`node ${ip}`, options).toString())
})

test('json secret parser', async () => {
  const azureSignToolCredentials = '{"du":"https://vcsjones.com","fd":"sha384","kvu":"https://p7keyvalut.vault.azure.net","kvm":true,"kvmf":false,"kvi":"ddecd689-3d6c-4311-b354-45ab6fa7e48c","kvs":"6m6e[0BDnOBkG=jFF7XMlyTmRXkOve=:","kvc":"github-actions","tr":"http://timestamp.digicert.com","td":"sha384"}'
  const secretsAST = new SecretParser(azureSignToolCredentials, FormatType.JSON)

  const du = secretsAST.getSecret('$.du', false)
  console.log(`du:${du}.`)
  expect(du).toEqual('https://vcsjones.com')

  const kvm = secretsAST.getSecret('$.kvm', false)
  console.log(`kvm:${kvm}.`)
  expect(kvm).toEqual(true)

  const missing = secretsAST.getSecret('$.missing', false)
  console.log(`missing:${missing}.`)
  expect(missing).toBeFalsy()

  const kvmf = secretsAST.getSecret('$.kvmf', false)
  console.log(`kvmf:${kvmf}.`)
  expect(kvmf).toBeFalsy()

  if(kvm){
    console.log(`kvm:is true.`)
  }
  if(!kvmf){
    console.log(`kvmf:is false.`)
  }

})
