# AutoInstall Plugin for Serverless
Kenneth Falck <kennu@iki.fi> 2016

This is a plugin that automatically runs npm install under each Serverless
Component when functions are deployed. This ensures that you don't
accidentally deploy a component without a node\_modules folder, or with
out-of-date dependencies in node\_modules when package.json has been
modified.

## Installation

First install the plugin into your Serverless project:

    npm install --save serverless-plugin-autoinstall

Then edit your **s-project.json**, locate the plugins: [] section, and add
the plugin as follows:

    plugins: [
        "serverless-plugin-autoinstall"
    ]
