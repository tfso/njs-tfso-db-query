﻿import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

export abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
    private _connection: MsSql.Connection;
    private _transaction: MsSql.Transaction;

    constructor(connection?: MsSql.Connection | MsSql.Transaction) {
        super();

        if (connection != null)
            this.connection = connection;
    }

    public set connection(connection: MsSql.Transaction | MsSql.Connection) {
        if (connection instanceof MsSql.Transaction) {
            this._transaction = connection;
            this._connection = connection.connection;
        }
        else {
            this._connection = connection;
        }
    }

    protected input(name: string, value: any): void
    protected input(name: string, type: any, value: any): void
    protected input(name: string, type: any, value?: any): void {
        if (arguments.length == 2) {
            value = type; type = null;
        }

        this.parameters[name] = { name: name, type: type, value: value };
    }

    protected createRequest(): MsSql.Request {
        return new MsSql.Request();
    }

    protected executeQuery(): Promise<RecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let request = this.createRequest(), // thread safe as we have a request object for each promise
                    predicate: (entity: TEntity) => boolean,
                    timed = Date.now(),
                    totalRecords = -1,
                    totalPredicateIterations: number = 0;

                request.multiple = true;
                request.connection = this._connection;
                request.transaction = this._transaction;

                for (let key in this.parameters) {
                    let param = this.parameters[key];

                    if(param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }

                request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);

                    try {
                        let results: Array<any> = [];

                        for (let i = 0; i < recordset.length; i++) {
                            // go through each recordst and check for totalRecords
                            if (totalRecords == -1) {
                                let row: any = null;

                                if (recordset[i].length > totalPredicateIterations)
                                    totalPredicateIterations = recordset[i].length;

                                if (Array.isArray(recordset[i]) && recordset[i].length > 0)
                                    row = recordset[i][0];

                                if (row) {
                                    if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false) {
                                        totalRecords = Number(row['pagingTotalCount'])
                                    }
                                }
                            }

                            // set last recordset as the result recordset
                            results = recordset[i];
                        }

                        let where = this.query.operations.first(WhereOperator),
                            predicate: (entity: TEntity) => boolean,
                            entities: Array<TEntity>;

                        if (where) {
                            this.query.operations.remove(where);

                            predicate = ((op: WhereOperator<TEntity>) => {
                                return (entity: TEntity) => {
                                    return op.predicate.apply({}, [entity].concat(op.parameters));
                                }
                            })(<WhereOperator<TEntity>>where);
                        }

                        entities = results.map(this.transform);
                        if (predicate) {
                            entities = entities.filter(predicate);

                            if (this.query.operations.first(SkipOperator) || this.query.operations.first(TakeOperator))
                                totalRecords = entities.length;
                        }

                        resolve(new RecordSet(recordset ? this.query.toArray(entities) : [], rowsAffected, Date.now() - timed, totalRecords >= 0 ? totalRecords : undefined));
                    }
                    catch (ex) {
                        reject(ex);
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }

        })
    }

    protected abstract transform(record: any): TEntity;
}

export default QueryRecordSet

export { RecordSet }