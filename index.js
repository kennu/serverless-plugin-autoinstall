'use strict';

/**
 * Serverless Autoinstall Plugin
 * Kenneth Falck <kennu@iki.fi> 2016
 */

module.exports = function(S) {
  const path    = require('path'),
      fs        = require('fs'),
      SUtils    = require(S.getServerlessPath('utils')),
      SCli      = require(S.getServerlessPath('utils/cli')),
      SError    = require(S.getServerlessPath('Error')),
      BbPromise = require('bluebird'); // Serverless uses Bluebird Promises and we recommend you do to because they provide more than your average Promise :)

  /**
   * ServerlessPluginAutoinstall
   */

  class ServerlessPluginAutoinstall extends S.classes.Plugin {

    /**
     * Constructor
     * - Keep this and don't touch it unless you know what you're doing.
     */

    constructor() {
      super();
      this.alreadyInstalledPaths = {};
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
      S.addAction(this.autoinstall.bind(this), {
        handler:        'functionAutoinstall',
        description:    'Automatically runs npm install in each function folder that contains a package.json',
        context:        'function',
        contextAction:  'autoinstall',
        options:        [
          {
            option:      'all',
            shortcut:    'a',
            description: 'Autoinstall all functions'
          }
        ],
        parameters:      [
          {
            parameter:   'function',
            description: 'Function to autoinstall (use -a for all)',
            position:    '0->'
          }
        ]
      });
      return BbPromise.resolve();
    }

    /**
     * Register Hooks
     * - If you would like to register hooks (i.e., functions) that fire before or after a core Serverless Action or your Custom Action, include this function.
     * - Make sure to identify the Action you want to add a hook for and put either "pre" or "post" to describe when it should happen.
     */

    registerHooks() {
      S.addHook(this._preCodePackageLambda.bind(this), {
        action: 'codePackageLambda',
        event:  'pre'
      });

      return BbPromise.resolve();
    }

    /**
     * Post deploy install hook
     * - Be sure to ALWAYS accept and return the "evt" object, or you will break the entire flow.
     * - The "evt" object contains Action-specific data.  You can add custom data to it, but if you change any data it will affect subsequent Actions and Hooks.
     * - You can also access other Project-specific data @ S Again, if you mess with data on this object, it could break everything, so make sure you know what you're doing ;)
     */

    _preCodePackageLambda(evt) {
      return this.autoinstallFunction(S.getProject().getFunction(evt.options.name))
      .then(() => {
        return evt;
      });
    }

    autoinstall(evt) {
      var promise = BbPromise.resolve();
      var project = S.getProject();
      var functions = Object.keys(project.functions).map(functionName => project.functions[functionName]);
      var found = 0;

      if (!evt.options.all && !evt.options.function.length) {
        return BbPromise.reject(new SError('Function name or -a required'));
      }

      if (!evt.options.all) {
        // Select specified functions
        var errors = 0;
        functions = evt.options.function.map((functionName) => {
          var fn = project.getFunction(functionName);
          if (!fn) {
            SCli.log('Function not found: ' + functionName);
            errors += 1;
          }
          return fn;
        });
        if (errors) {
          return BbPromise.reject(new SError('Function not found'));
        }
      }

      return BbPromise.resolve()
      .then(() => {
        functions.map((fn) => {
          promise = promise.then(() => {
            return this.autoinstallFunction(fn);
          });
        });
        return promise;
      })
      .then(() => {
        return evt;
      });
    }

    autoinstallFunction(fn) {
      if (!fn.runtime.match(/^nodejs/)) {
        // Ignore non-node functions
        return Promise.resolve();
      }
      var absProjectPath = path.resolve(S.getProject().getRootPath());
      var absFunctionPath = path.resolve(fn.getRootPath());
      var prevPath;
      var packagePath;

      // Try to find a function parent path with package.json
      while (absFunctionPath.length > absProjectPath.length && absFunctionPath != prevPath && !packagePath) {
        var packageJsonPath = path.join(absFunctionPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          // Found it!
          packagePath = absFunctionPath;
        }
        absFunctionPath = path.resolve(absFunctionPath, '..');
      }
      if (packagePath) {
        if (!this.alreadyInstalledPaths[packagePath]) {
          this.alreadyInstalledPaths[packagePath] = true;
          SCli.log('Autoinstalling package ' + packagePath);
          SUtils.npmInstall(packagePath);
        }
      }
      return Promise.resolve();
    }
  }

  // Export Plugin Class
  return ServerlessPluginAutoinstall;

};

// Godspeed!
