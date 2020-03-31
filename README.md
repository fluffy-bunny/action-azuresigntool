# Based on the Template: Create a JavaScript Action using TypeScript
[actions/typescript-action](https://github.com/actions/typescript-action)

## AzureSignTool, the fluffy-bunny way
As of this writing the original AzureSignTool has not released a managed identity version.  Once it does, my forked version will be deleted.  
[AzureSignTool CLI](https://github.com/fluffy-bunny/AzureSignTool)  

Also, I am hoping that the AST-CLI will eventually post a prebuilt binaries, as I found that doing an install was taking to much time.  I checked in the AzureSignTool.dll and all its dependencies into my repo and just sync it.  

In short, this action set out to expose only the necessary command lines I was using.  So there isn't a one to one inputs that this action accepts vs the AzureSignTool cli.

I only support `"--input-file-list"` as as way to tell the AST-CLI what files to sign.  This is done because of efficiency.  As such, I rely on another custom action to build the file list for me.   
[Recursive File Query by Extension](https://github.com/marketplace/actions/recursive-file-query-by-extension)  

## Repo Secrets

### AZURE_CREDENTIALS (PREFERED - OPTIONAL)
[Azure Login](https://github.com/marketplace/actions/azure-login)  
Azure Managed Identity is the prefered way of using the tool, so please follow those instructions in signing into Azure.  

### AZURE_SIGN_TOOL_CREDENTIALS (REQUIRED)
#### Managed Identity (Prefered)  

```json
{
	"du": "https://vcsjones.com",
	"fd": "sha384",
	"kvu": "https://my-vault.vault.azure.net",
	"kvc": "my-key-name",
	"tr": "http://timestamp.digicert.com",
	"td": "sha384",
	"kvm": true
}
```
Here we don't see the `"kvi"` and `"kvs"` entries.  We do see the flag `"kvm":true`.  
Given you tolerance for secrets, this entry could be in yml in the clear.  

#### Client Credentials  (Azure Service Principal)  
```json
{
	"du": "https://vcsjones.com",
	"fd": "sha384",
	"kvu": "https://my-vault.vault.azure.net",
	"kvi": "01234567-abcd-ef012-0000-0123456789ab",
	"kvs": "<token>",
	"kvc": "my-key-name",
	"tr": "http://timestamp.digicert.com",
	"td": "sha384",
	"kvm": false
}
```
As oposed to the Managed Identity approach, this one needs `"client_credentials"` in the form of `"kvi"` and `"kvs"` entries.  
`"kvm":false` is required.

```
- name: 'az login'
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Recursive File Query by Extension
      uses: fluffy-bunny/action-filequery@v0.2dev
      with: 
        folder: builtFiles
        outputFile: 'builtFiles/files-to-sign.txt'

- name: This Action
      uses: ./
      with: 
        azure_sign_tool_credentials: ${{ secrets.AZURE_SIGN_TOOL_CREDENTIALS }}
        azure_sign_tool_assembly: ./tools/AzureSignTool-DEV/netcoreapp2.1/any/AzureSignTool.dll
        files_to_sign: builtFiles/files-to-sign.txt
```
