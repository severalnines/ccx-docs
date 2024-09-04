# CCX Customer Docs

Customer documentation for those running, and offering, CCX on their own infrastructure is here, in the `wiki` folder.

Github Actions will auto build and push the docs to customer repos.

## How to update customer documentation

1. Clone this repo (or edit in browser)
2. Make changes to the `wiki/` folder (avoid making subdirectories)
3. Commit and push changes
4. Github Actions will run for any customer that has been configured

## How to add a new customer

1. Create a deploy key - `ssh-keygen -t ed25519 -C "action@github.com"` (you can also use the 1Password extension for this as it removes any formatting issues)
2. Add the public deploy key to the customer repo - i.e. `ccx-newcust` and ensure it has write access
3. Add the private deploy key **to the secrets of this repo**, using the convention: `DEPLOY_KEY_$CUST`
4. Add both keys to 1password in the `CCX Dev` vault with the name `Github Deploy Key - $CUST`
5. For more detailed info, see [here](https://cpina.github.io/push-to-another-repository-docs/setup-using-ssh-deploy-keys.html#setup-ssh-deploy-keys)
6. Copy the workflow for `.github/workflows/update_ccx_test_push.yml`, modify the variable for `CUST` and `deployKey` and save as `update_$CUST_push.yml`
7. Commit and push any documentation changes you need

