import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/dist/lib/repository/db/query';
import { RecordSet } from 'tfso-repository/dist/lib/repository/db/recordset';
export declare abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
    private _request;
    constructor(connection?: MsSql.Connection | MsSql.Transaction);
    connection: MsSql.Transaction | MsSql.Connection;
    protected input(name: string, value: any): void;
    protected input(name: string, type: any, value: any): void;
    protected executeQuery(): Promise<RecordSet<TEntity>>;
    protected abstract transform(record: any): TEntity;
}
export default QueryRecordSet;
export { RecordSet };
