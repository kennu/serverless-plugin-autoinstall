'use strict';

/**
 * Serverless Autoinstall Plugin
 * Kenneth Falck <kennu@iki.fi> 2016
 */

module.exports = function(ServerlessPlugin, serverlessPath) { // Always pass in the ServerlessPlugin Class

  const path    = require('path'),
      fs        = require('fs'),
      SUtils    = require(path.join(serverlessPath, 'utils/index')),
      SCli      = require(path.join(serverlessPath, 'utils/cli')),
      BbPromise = require('bluebird'); // Serverless uses Bluebird Promises and we recommend you do to because they provide more than your average Promise :)

  /**
   * ServerlessPluginAutoinstall
   */

  class ServerlessPluginAutoinstall extends ServerlessPlugin {

    /**
     * Constructor
     * - Keep this and don't touch it unless you know what you're doing.
     */

    constructor(S) {
      super(S);
      this.alreadyInstalledComponents = {};
    }

    /**
     * Define your plugins name
     * - We recommend adding prefixing your personal domain to the name so people know the plugin author
     */

    static getName() {
      return 'net.kfalck.' + ServerlessPluginAutoinstall.name;
    }

    /**
     * Register Actions
     * - If you would like to register a Custom Action or overwrite a Core Serverless Action, add this function.
     * - If you would like your Action to be used programatically, include a "handler" which can be called in code.
     * - If you would like your Action to be used via the CLI, include a "description", "context", "action" and any options you would like to offer.
     * - Your custom Action can be called programatically and via CLI, as in the example provided below
     */

    registerActions() {
      this.S.addAction(this.autoinstall.bind(this), {
        handler:        'autoinstall',
        description:    'Automatically runs npm install in each Component folder',
        context:        'component',
        contextAction:  'autoinstall',
        options:        [],
        parameters:     []
      });
      return BbPromise.resolve();
    }

    /**
     * Register Hooks
     * - If you would like to register hooks (i.e., functions) that fire before or after a core Serverless Action or your Custom Action, include this function.
     * - Make sure to identify the Action you want to add a hook for and put either "pre" or "post" to describe when it should happen.
     */

    registerHooks() {
      this.S.addHook(this._preCodePackageLambda.bind(this), {
        action: 'codePackageLambda',
        event:  'pre'
      });

      return BbPromise.resolve();
    }

    /**
     * Post deploy install hook
     * - Be sure to ALWAYS accept and return the "evt" object, or you will break the entire flow.
     * - The "evt" object contains Action-specific data.  You can add custom data to it, but if you change any data it will affect subsequent Actions and Hooks.
     * - You can also access other Project-specific data @ this.S Again, if you mess with data on this object, it could break everything, so make sure you know what you're doing ;)
     */

    _preCodePackageLambda(evt) {
      let func = this.S.state.getFunctions({ paths: [evt.options.path] })[0];
      if (func) {
        let component = func.getComponent();
        if (!this.alreadyInstalledComponents[component.name]) {
          this.alreadyInstalledComponents[component.name] = true;
          return this.autoinstallComponent(component.name, component._config.fullPath)
          .then(function () {
            return evt;
          });
        }
      }
      return Promise.resolve(evt);
    }

    autoinstall(evt) {
      let self = this;
      let components = this.S.state.project.components;
      var promise = BbPromise.resolve();
      Object.keys(components).map(function (componentName) {
        promise = promise.then(function () {
          return self.autoinstallComponent(componentName, components[componentName]._config.fullPath);
        });
      });
      return promise.then(function () {
        return evt;
      });
    }

    autoinstallComponent(componentName, fullPath) {
      SCli.log('Autoinstalling component ' + componentName + ' in ' + fullPath);
      SUtils.npmInstall(fullPath);
      return Promise.resolve();
    }
  }

  // Export Plugin Class
  return ServerlessPluginAutoinstall;

};

// Godspeed!
