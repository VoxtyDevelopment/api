
# Vox Development API

An toned down version of the latest Vox Development API. This was in use in 2024 for the backend services of Vox Development.

**There is no support for this product as it has reached it's end of life. There will be minimal update and bug fixes.**

Requirements;

- NodeJS Server
- Discord Webhook
- MySQL server

Installation steps;

- Move all files into a NodeJS server.
- Fill out the config.js with all information
- Open CMD (If using pterodactyl you can skip these steps below just upload the files to the server and start it)
- CD into the API's directory and run `npm i`
- Then start the API using `node .`

Pages included in API;

- Admin Login Page (`/admin/auth`)
- Admin Key Manage Page (`/admin/licenses`)

- Validate (`/validate`)

If you are looking to use this API for controlling license keys in your code I have supplied the code to do so for LUA, C#, and JS. You can find it [here](https://github.com/VoxtyDevelopment/licensekey).

Just note for C# you need Newtonsoft.Json & CitizenFX.Core.Server. I have only been able to get it working on FX Manifest version `cerulean`.

This API was developed by;
- [@voxty](https://github.com/voxty)
- [@mhm](https://github.com/ebt-mhm)