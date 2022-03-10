import { Logger } from 'common/logger';
import { injectable } from 'tsyringe';

@injectable()
export class DatabaseConnector{

constructor(@inject('IDatabaseConnector') private _db: IDatabaseConnector) {}

public init = async (): Promise<boolean> => {
    try {
        await this._db.connect();
        return true;
    } catch (error) {
        Logger.instance().log('Create database error: ' + error.message);
        return false;
    }
};


    public dropDatabase = async (): Promise<boolean> => {
        try {
            await this._db.dropDatabase();
            return true;
        } catch (error) {
            Logger.instance().log('Drop database error: ' + error.message);
            return false;
        }
    };
}