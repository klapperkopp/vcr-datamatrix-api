# Vonage Cloud Runtime & Zendesk - Messages APi Inbound Media to Tickets

This app is running a nodejs server (optionally on Vonage Cloud Runtime (VCR)) and will listen for Inbound Messages on Whatsapp via Vonage Messages API. If the Inbound Messages contain images, it will try to read a QR code from the image and create a Zendesk Ticket with the information from the QR Code.

## Requirements

- A Vonage Developer Account ([Get one here](https://developer.vonage.com/sign-up))
- A Whatsapp Business API Account created through the [External Accounts section](https://dashboard.nexmo.com/messages/social-channels) of the Vonage Developer Dashboard
- A Zendesk Instance ([Get a Demo Account here](https://www.zendesk.de/register/#step-1)) and the API Token
- Vonage Cloud Runtime CLI (optional)
- ngrok or similar for local testing (optional)

## Zendesk Setup

- Get your Zendesk API Token from https://**your_zendesk_instance_name**.zendesk.com/admin/apps-integrations/apis/zendesk-api/ (fill in your own Zendesk instance name in the url)
- You get the Token after accepting the terms under Settings by activating Token Access and clicking Create a Token

## NodeJS Setup

- Run `npm install`
- You will need ngrok or similar to get a public url for your app hen running
- You need to manually configure your application in the Vonage Dashboard.
  - The Inbound Messages URL and Status URL in the Messaging Settings of your app should point to https://your_ngrok_url/

### Run it

- To start the app without VCR, run `ZENDESK_BASE_URL="https://**your_zendesk_instance_name**.zendesk.com" ZENDESK_TOKEN="your_zendesk_api_token" nodemon index.js`

## VCR Setup (optional)

1. [Install and Configure Vonage VCR CLI](https://developer.vonage.com/en/vcr/overview?source=vcr) (might be available only for selected customers)
2. Create a Vonage application through the VCR CLI with `neru app create --name "your_app_name"` and note down the app ID
3. Run `cp vcr.yaml.example vcr.yaml` and fill in the previously noted app ID as well as the Environment variables that are not secrets in the new vcr.yaml file
4. Run `neru configure --app-id your_app_id`
5. Run `neru secrets create --name ZENDESK_TOKEN --value your_zendesk_api_token` to securely store your Zendesk Token as a secret in VCR
6. Run `npm install`

### VCR - Run in Debug

- Run `neru debug`

### VCR - Deploy the App

- Run `neru deploy`
