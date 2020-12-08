
/**
 * imports
 */
import Fs from 'fs';
import Url from 'url';
import Path from 'path';
import Webpack from 'webpack';
import _beforeLast from '@webqit/util/str/beforeLast.js';
import * as DotJs from '@webqit/backpack/src/dotfiles/DotJs.js';
import * as client from '../config/client.js'


/**
 * @description
 */
export const desc = {
    build: 'Creates the application Client Build.',
};

/**
 * @build
 */
export async function build(Ui, params = {}) {
    const config = await client.read(params);
    // Consistent forward slashing
    const forwardSlash = str => str.replace(/\\/g, '/');
    let clientModulesDir = forwardSlash(Url.fileURLToPath(Path.join(import.meta.url, '../../modules/client')));
    var clientDirSplit = Path.resolve(config.CLIENT_DIR).replace(/\\/g, '/').split('/');
    let waiting;

    // -------------------
    // Create the Service Worker file
    // -------------------

    if (config.CREATE_WORKER) {

        var workerBundlingConfig = config.WORKER_BUNDLING || {};
        if (!workerBundlingConfig.entry) {
            workerBundlingConfig.entry = clientDirSplit.join('/') + '/worker.js';
        }
        if (!workerBundlingConfig.output) {
            workerBundlingConfig.output = {
                filename: 'worker.js',
                path: Path.resolve(config.PUBLIC_DIR),
            };
        }

        var workerBuild = {
            imports: {},
            code: [],
        };

        // >> Import the Webflo Client file
        var navigatorWorker = clientModulesDir + '/Worker.js';
        workerBuild.imports[navigatorWorker] = 'Worker';

        Ui.log('');
        Ui.title(`SERVICE WORKER BUILD`);
        // >> Routes mapping
        buildRoutes(Ui, Path.resolve(config.WORKER_DIR), workerBuild, 'Worker-Side Routing:');

        // >> Params
        workerBuild.code.push(``);
        workerBuild.code.push(`// >> Worker Params`);
        workerBuild.code.push(`const params = {`);
        Object.keys(config).forEach(name => {
            if (name.startsWith('WORKER_') && name !== 'WORKER_DIR') {
                workerBuild.code.push(`   ${name.replace('WORKER_', '')}: ${['boolean', 'number'].includes(typeof config[name]) ? config[name] : `'${config[name]}'`},`);
            }
        });
        workerBuild.code.push(`   ROUTES: routes,`);
        workerBuild.code.push(`};`);

        // >> instantiation
        workerBuild.code.push(``);
        workerBuild.code.push(`// >> Worker Instantiation`);
        workerBuild.code.push(`Worker.call(null, params);`);
        
        // >> Write to file...
        waiting = Ui.waiting(Ui.f`Writing the Service Worker file: ${workerBundlingConfig.entry}`);
        waiting.start();

        // Write
        DotJs.write(workerBuild, workerBundlingConfig.entry, 'Service Worker File');
        
        waiting.stop();
        Ui.info(Ui.f`Service Worker file: ${workerBundlingConfig.entry}`);

    }

    // -------------------
    // Create the Client file
    // -------------------

    var clientBundlingConfig = config.CLIENT_BUNDLING || {};
    if (!clientBundlingConfig.entry) {
        clientBundlingConfig.entry = clientDirSplit.join('/') + '/app.js';
    }
    if (!clientBundlingConfig.output) {
        clientBundlingConfig.output = {
            filename: 'app.js',
            path: Path.resolve(config.PUBLIC_DIR),
        };
    }

    var clientBuild = {
        imports: {},
        code: [],
    };

    Ui.log('');
    Ui.title(`CLIENT BUILD`);
    // >> Routes mapping
    buildRoutes(Ui, Path.resolve(config.CLIENT_DIR), clientBuild, 'Client-Side Routing:');

    // >> Import the Webflo Client file
    clientBuild.imports[clientModulesDir + '/Client.js'] = 'Client';

    // >> Client Params
    clientBuild.code.push(``);
    clientBuild.code.push(`// >> Client Params`);
    clientBuild.code.push(`const params = {`);
    Object.keys(config).forEach(name => {
        if (name.startsWith('CLIENT_') && name !== 'CLIENT_DIR') {
            clientBuild.code.push(`   ${name.replace('CLIENT_', '')}: typeof ${name} !== 'undefined' ? ${name} : ${['boolean', 'number'].includes(typeof config[name]) ? config[name] : `'${config[name]}'`},`);
        }
    });
    clientBuild.code.push(`   ROUTES: routes,`);
    clientBuild.code.push(`};`);

    // >> Client Instantiation
    clientBuild.code.push(``);
    clientBuild.code.push(`// >> Client Instantiation`);
    clientBuild.code.push(`Client.call(null, params);`);

    // Service Worker registration code?
    if (config.CREATE_WORKER) {
        if (config.WORKER_SUPPORT_PUSH) {
            clientBuild.imports[clientModulesDir + '/Push.js'] = 'Push';
        }
        clientBuild.code.push(...[
            ``,
            `// >> Service Worker Registration`,
            `if ('serviceWorker' in navigator) {`,
            `    window.addEventListener('load', () => {`,
            `        navigator.serviceWorker.register('/${workerBundlingConfig.output.filename}', {scope: '${config.WORKER_SCOPE}'}).then(async registration => {`,
            `            console.log('Service worker registered.');`,
            `            await /*SUPPORT_PUSH*/${config.WORKER_SUPPORT_PUSH} ? new Push(registration, {`,
            `                REGISTRATION_URL: '${config.WORKER_PUSH_REGISTRATION_URL}',`,
            `                UNREGISTRATION_URL: '${config.WORKER_PUSH_UNREGISTRATION_URL}',`,
            `                PUBLIC_KEY: '${config.WORKER_PUSH_PUBLIC_KEY}',`,
            `            }) : null;`,
            `        });`,
            `    });`,
            `}`,
            ``,
            `/**`,
            `navigator.serviceWorker.addEventListener('message', event => {`,
            `    if (event.data.isNotificationTargetEvent) {`,
            `        // NotificationClick event for this client`,
            `        console.log('NotificationClick event for this client', event.data);`,
            `    } else if (event.data.isNotificationUntargetEvent) {`,
            `        // NotificationClose event for this client`,
            `        console.log('NotificationClose event for this client', event.data);`,
            `    } else if (event.data.isMessageRelay) {`,
            `        // Message from other clients`,
            `        console.log('Message from other clients', event.data);`,
            `    }`,
            `});`,
            `*/`,
            ``,
        ]);
    }
    
    // >> Write to file...
    waiting = Ui.waiting(`Writing the client entry file: ${clientBundlingConfig.entry}`);
    waiting.start();

    // Write
    DotJs.write(clientBuild, clientBundlingConfig.entry, 'Client Build File');
        
    waiting.stop();
    Ui.info(Ui.f`Client Build file: ${clientBundlingConfig.entry}`);

    // -------------------
    // Run webpack
    // -------------------
    
    if (config.CLIENT_BUNDLING !== false || config.WORKER_BUNDLING !== false) {
        Ui.log('');
        Ui.title(`BUNDLES`);
    }
    if (config.CREATE_WORKER && config.WORKER_BUNDLING !== false) {
        await createBundle(Ui, workerBundlingConfig, 'Bundling the Service Worker Build file');
    }
    if (config.CLIENT_BUNDLING !== false) {
        await createBundle(Ui, clientBundlingConfig, 'Bundling the Client Build file');
    }
    
};

/**
 * Creates a bundle using webpack
 * 
 * @param {object} config 
 * @param {string} desc 
 * 
 * @return void
 */
const createBundle = (Ui, config, desc) => {
    return new Promise(resolve => {
        var waiting = Ui.waiting(`${desc} ...`);
        Ui.log('');
        Ui.info(Ui.f`FROM: ${config.entry}`);
        Ui.info(Ui.f`TO: ${config.output.path + '/' + config.output.filename}`);
        Ui.log('');
        waiting.start();

        // Run
        var compiler = Webpack(config);
        compiler.run((err, stats) => {
            waiting.stop();
            if (err) {
                Ui.title(`Errors!`);
                Ui.error(err);
            }
            Ui.log(stats.toString({
                colors: true,
            }));

            resolve();
        });
    });
};

/**
 * Initializes a server on the given working directory.
 * 
 * @param object params
 * 
 * @return void
 */
const buildRoutes = (Ui, entry, build, desc) => {
    // -------------------
    // Helper functions
    // -------------------
    // Directory walking
    const walk = (dir, callback) => {
        Fs.readdirSync(dir).forEach(f => {
            let resource = Path.join(dir, f);
            if (Fs.statSync(resource).isDirectory()) {
                walk(resource, callback);
            } else {
                var ext = Path.extname(resource) || '';
                callback(resource, ext);
            }
        });
    };

    Ui.log('');
    Ui.title(desc);

    // >> Routes mapping
    build.code.push(`// >> ` + desc);
    build.code.push(`const routes = {};`);

    var indexCount = 0;
    if (entry && Fs.existsSync(entry)) {
        walk(entry, (file, ext) => {
            //relativePath = relativePath.replace(/\\/g, '/');
            if (file.replace(/\\/g, '/').endsWith('/index.js')) {
                var relativePath = Path.relative(entry, file).replace(/\\/g, '/');
                // Import code
                var routeName = 'index' + (++ indexCount);
                build.imports['./' + relativePath] = '* as ' + routeName;
                // Definition code
                var routePath = _beforeLast('/' + relativePath, '/index.js');
                build.code.push(`routes['${routePath || '/'}'] = ${routeName};`);
                // Show
                Ui.log(`> ./ ${relativePath}`);
            }
        });
    }
    if (!indexCount) {
        Ui.log(`> (none)`);
    }
};