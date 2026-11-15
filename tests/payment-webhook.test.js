const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const load = Module._load;
let mockConnection;
let markCalls = 0;
Module._load = function(request, parent, main) {
    if (request === '../config/database' && parent.filename.endsWith('paymentWebhookModel.js')) return { getConnection: async () => mockConnection };
    if (request === './orderModel' && parent.filename.endsWith('paymentWebhookModel.js')) return { markBankTransferPaid: async () => { markCalls++; return true; } };
    return load.call(this, request, parent, main);
};
const { normalize, parseVietnamDate } = require('../src/backend/services/paymentWebhookService');
const { recordAndApply } = require('../src/backend/models/paymentWebhookModel');
Module._load = load;
const env = { VIETQR_ACCOUNT_NO: '000123456', SEPAY_GATEWAY: 'TestBank' };
const sample = { id: 1234, transferAmount: 2000, transactionDate: '2026-11-15 18:00:00', transferType: 'in', accountNumber: '000123456', gateway:'TestBank', content: 'LAPTOP DH13' };
const order = { total_amount: '2000.00', payment_method: 'bank_transfer', payment_status: 'unpaid', status:'pending', created_epoch: 0 };
const tx = normalize(sample, env);
test('validate incoming, account, bank, note, Vietnamese time', () => {
    assert.equal(tx.orderId, 13);
    assert.equal(tx.epoch, Date.parse('2026-11-15T11:00:00Z') / 1000);
    assert.equal(normalize({...sample, transferType:'out'}, env), null);
    assert.equal(normalize({...sample, accountNumber:'123456'}, env), null);
    assert.equal(normalize({...sample, gateway:'Other'}, env), null);
    assert.equal(normalize({...sample, content:'LAPTOP DH13 LAPTOP DH14'}, env).orderId, null);
    assert.equal(normalize({...sample, content:'LAPTOP DH13ABC'}, env).orderId, null);
    assert.equal(parseVietnamDate('2026-02-30 18:00:00'), null);
});
function fake(o,duplicate=false) {
    let commits = 0;
    mockConnection = { beginTransaction:async()=>{}, execute: async(sql) => {
        if(sql.startsWith('INSERT') && duplicate) throw Object.assign(new Error(), {code:'ER_DUP_ENTRY'});
        if(sql.startsWith('SELECT')) return [o ? [o] : []];
        return [{}];
    }, commit: async()=>{commits++}, rollback:async()=>{}, release:()=>{} };
    return () => commits;
}
test('correct payment and duplicate delivery', async()=>{
    markCalls=0;
    const commits = fake(order);
    assert.equal(await recordAndApply(tx),'paid'); assert.equal(markCalls,1); assert.equal(commits(),1);
    fake(order,true); assert.equal(await recordAndApply(tx),'duplicate'); assert.equal(markCalls,1);
});
test('wrong amount, cancelled, paid, COD, missing and old transaction', async()=>{
    markCalls=0;
    for(const [o,expected] of [[{...order,total_amount:'2001.00'},'amount_mismatch'],[{...order,status:'cancelled'},'cancelled'],[{...order,payment_status:'paid'},'already_paid'],[{...order,payment_method:'cod'},'wrong_method'],[null,'order_not_found'],[{...order,created_epoch:tx.epoch+1},'before_order']]){
        fake(o); assert.equal(await recordAndApply(tx),expected);
    }
    assert.equal(markCalls,0);
});
