﻿import assert = require('assert');

import * as MsSql from 'mssql';

import { QueryStream } from './../db/querystream';
import { RequestMock } from './base/requestmock';

describe("When using QueryStream for MsSql queries", () => {
    var myQuery: Select,
        data: Array<any>;

    beforeEach(() => {
        data = [
            { no: 1, name: 'ABC' },
            { no: 2, name: 'DEF' },
            { no: 3, name: 'GHI' },
            { no: 4, name: 'JKL' },
            { no: 5, name: 'MNO' },
            { no: 6, name: 'PQR' },
            { no: 7, name: 'STU' },
            { no: 8, name: 'VWX' },
            { no: 9, name: 'YZÆ' },
            { no: 10, name: 'ØÅ1' },
            { no: 11, name: '234' },
            { no: 12, name: '567' },
            { no: 13, name: '890' }
        ];

        myQuery = new Select(data);
    })

    it("should return all records", () => {
        return myQuery
            .then(recordset => {

                assert.equal(recordset.records.length, 13);
            });
    })

    it("should handle paging", () => {
        myQuery.query.skip(3).take(5);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
                assert.equal(recordset.records[0].name, "JKL");
            });
    })

    it("should be able to skip rows", () => {
        myQuery.query.skip(10);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 3);
                assert.equal(recordset.records[0].name, "234");
            });
    })

    it("should be able to take rows", () => {
        myQuery.query.take(5);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
            });
    })

    it("should be able to override skipping of rows", () => {
        myQuery.query.skip(3).take(5);

        var skip = myQuery.query.operations.values().next().value;
            
        myQuery.query.operations.remove(skip);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
                assert.equal(recordset.records[0].name, "ABC");
            });
    })

    it("should fail for driver/query problems", (done) => {

        myQuery.shouldFail = true;

        myQuery
            .then((model) => {
                done(new Error('Expected Query promise to fail'));
            }, (err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })

    it("should fail for driver/query problems using catch", (done) => {

        myQuery.shouldFail = true;

        myQuery
            .then((model) => {
                done(new Error('Expected Query promise to fail'));
            })
            .catch((err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })

    it("should fail for driver/query problems using only catch", (done) => {

        myQuery.shouldFail = true;

        myQuery
            .catch((err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })

    it("should fail for driver/query problems using nested catch", (done) => {
        myQuery.shouldFail = true;

        Promise.resolve(
            myQuery.then(() => {
                done(new Error('Never going to hit'));
            })
        )
            .catch((err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })
})

interface IModel {
    no: number
    name: string
}

class Select extends QueryStream<IModel>
{
    // for mocking
    public shouldFail = false;

    constructor(private data: Array<any>) {
        super();

        this.commandText = "SELECT *";
    }

    protected transform(record) {
        return <IModel>{
            no: record.no,
            name: record.name
        };
    }

    /**
     * Overriding for mocking as we don't have a valid MsSql connection and request
     */
    protected createRequest(): MsSql.Request {
        if (this.shouldFail) {
            return new RequestMock([], true);
        } else {
            return new RequestMock(this.data);
        }
    }
}