import cors from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import 'reflect-metadata';
import { Router } from './api/routes/router';
import { Logger } from './common/logger';
import { ConfigurationManager } from './config/configuration.manager';
import { Loader } from './startup/loader';

/////////////////////////////////////////////////////////////////////////

export default class Application {
    public _app: express.Application = null;

    private _router: Router = null;

    private static _instance: Application = null;

    private constructor() {
        this._app = express();
        this._router = new Router(this._app);
    }

    public static instance(): Application {
        return this._instance || (this._instance = new this());
    }

    public app(): express.Application {
        return this._app;
    }

    public start = async (): Promise<void> => {
        try {
            //Load configurations
            ConfigurationManager.loadConfigurations();

            //Load the modules
            await Loader.init();

            if (process.env.NODE_ENV === 'test') {
                await Loader.databaseConnector.dropDatabase();
            }
            
            //Connect with database
            await Loader.databaseConnector.init();

            //Set-up middlewares
            await this.setupMiddlewares();

            //Set the routes
            await this._router.init();

            process.on('exit', (code) => {
                Logger.instance().log(`Process exited with code: ${code}`);
            });

            //Start listening
            await this.listen();
        } catch (error) {
            Logger.instance().log(`An error occurred while starting api service. ${error.message}`);
        }
    };

    private setupMiddlewares = async (): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            try {
                this._app.use(express.urlencoded({ extended: true }));
                this._app.use(express.json());
                this._app.use(cors());

                const MAX_UPLOAD_FILE_SIZE = ConfigurationManager.MaxUploadFileSize();

                this._app.use(
                    fileUpload({
                        limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
                        preserveExtension: true,
                        createParentPath: true,
                        parseNested: true,
                        useTempFiles: true,
                        tempFileDir: '/tmp/uploads/',
                    })
                );
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    };

    private listen = () => {
        return new Promise((resolve, reject) => {
            try {
                const port = process.env.PORT;
                const server = this._app.listen(port, () => {
                    const serviceName = `api-${process.env.NODE_ENV}`;
                    Logger.instance().log(
                        `${serviceName} is up and listening on port ${process.env.PORT.toString()} url: ${
                            ConfigurationManager._config.BaseUrl
                        }`
                    );
                    this._app.emit('server_started');
                });
                module.exports.server = server;
                resolve(this._app);
            } catch (error) {
                reject(error);
            }
        });
    };
}
