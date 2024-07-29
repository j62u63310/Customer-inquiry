import { baseItem, fieldsCodes } from './fields';
import Swal from 'sweetalert2';

const sheetAppID = 174;

export async function fetchAllData(appID){
    let allRecords = [];
    let offset = 0;
    const limit = 500;

    try {
        while (true) {
            const getRecord = {
                app: appID,
                query: `limit ${limit} offset ${offset}`
            }
            const resp = await kintone.api(kintone.api.url('/k/v1/records', true),'GET', getRecord);
            allRecords = allRecords.concat(resp.records);
            offset += limit;
            if (resp.records.length < limit) break;
        }
    } catch (err) {
        console.error(`fetchData: ${err}`);
        throw err;
    }

    return allRecords;
}


export async function checkOrder(){
    let order = [];
    try {
        const orderData = await fetchAllData(kintone.app.getId());
        for (const data of orderData) {
            let allExist = true;
            const getRecord = {
                app: sheetAppID,
                query: `客戶來詢單號 in ("${data.客戶來詢單號.value}")`
            };
            const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', getRecord);
            if (resp.records.length === 0) {
                allExist = false;
                break;
            }
            if (allExist) {
                order.push(data.客戶來詢單號.value);
            }
        }
    } catch (err) {
        console.error(`checkOrder: ${err}`);
    }
    return order;
};

export async function summaryData(order){
    const consolidated = [];

    const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        app: sheetAppID,
        query: `客戶來詢單號 in ("${order}")`
    });

    for (const record of resp.records) {
        for(const row of record.子件明細.value){
            if(row.value[fieldsCodes.子件明細規格].value == "") continue;
            const item = { ...baseItem };
            item["主件規格"] = record[fieldsCodes.主件規格].value;
            item["需求數量"] = record[fieldsCodes.數量].value;
            item["總金額"] = record[fieldsCodes.總金額].value;
            item["客戶來詢單號"] = record[fieldsCodes.客戶來詢單號].value;

            item["子件規格"] = row.value[fieldsCodes.子件明細規格].value;
            item["處理選單"] = row.value[fieldsCodes.明細處理選單].value;
            item["單價"] = row.value[fieldsCodes.明細單價單位].value;
            item["製程"] = row.value[fieldsCodes.製程].value;
            item["總工時(分)"] = row.value[fieldsCodes.時間].value;
            item["加工費用(USD)"] = row.value[fieldsCodes.加工費用].value;
            item["成本(NTD)"] = row.value[fieldsCodes.成本].value;
            consolidated.push(item);
        }
    }
    return consolidated;
}


export async function updateData(records) {
    console.log(records);
    Swal.fire({
        title: '更新資料中...',
        html: '請稍後片刻等待更新',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const 客戶來詢單號 = records[0][fieldsCodes.客戶來詢單號];

    for (const record of records) {
        const 主件規格 = record[fieldsCodes.主件規格];
        const 加工費用 = record["加工費用(USD)"];
        const 需求數量 = record[fieldsCodes.需求數量];
        const 子件規格 = record[fieldsCodes.子件規格];
        const 處理選單 = record[fieldsCodes.處理選單];
        const 總工時 = record["總工時(分)"] || '';
        const 總金額 = record[fieldsCodes.總金額] || '';
        const 單價 = record[fieldsCodes.單價];
        const 成本 = record["成本(NTD)"];
        const 製程 = record[fieldsCodes.製程];

        // 首先搜索匹配的主件規格和其他條件，不包括子件規格
        const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: sheetAppID,
            query: `${fieldsCodes.客戶來詢單號} in ("${客戶來詢單號}") and 
                    ${fieldsCodes.主件規格} in ("${主件規格}") and
                    ${fieldsCodes.數量} in ("${需求數量}")`
        });

        if (resp.records.length > 0) {
            // 如果找到匹配的記錄，檢查子件明細
            const data = resp.records[0];
            let found = false;
            const tableData = data.子件明細;
            for (const row of tableData.value) {
                if (row.value[fieldsCodes.子件明細規格].value === 子件規格 &&
                    row.value[fieldsCodes.製程].value === 製程 &&
                    row.value[fieldsCodes.明細處理選單].value === 處理選單) {
                    // 更新現有子件明細
                    row.value[fieldsCodes.明細單價單位].value = 單價;
                    row.value[fieldsCodes.時間].value = 總工時;
                    row.value[fieldsCodes.加工費用].value = 加工費用;
                    row.value[fieldsCodes.成本].value = 成本;
                    found = true;
                    break;
                }
            }

            if (!found) {
                // 如果未找到匹配的子件明細，新增子件明細
                tableData.value.push({
                    value: {
                        [fieldsCodes.子件明細規格]: { value: 子件規格 },
                        [fieldsCodes.製程]: { value: 製程 },
                        [fieldsCodes.明細處理選單]: { value: 處理選單 },
                        [fieldsCodes.明細單價單位]: { value: 單價 },
                        [fieldsCodes.時間]: { value: 總工時 },
                        [fieldsCodes.加工費用]: { value: 加工費用 },
                        [fieldsCodes.成本]: { value: 成本 }
                    }
                });
            }

            // 更新記錄
            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
                app: sheetAppID,
                id: data.$id.value,
                record: {
                    [fieldsCodes.子件明細]: tableData
                }
            });
        } else {
            // 如果未找到匹配的記錄，創建新記錄
            const newRecord = {
                [fieldsCodes.客戶來詢單號]: { value: 客戶來詢單號 },
                [fieldsCodes.主件規格]: { value: 主件規格 },
                [fieldsCodes.數量]: { value: 需求數量 },
                [fieldsCodes.總金額]: { value: 總金額 },
                [fieldsCodes.子件明細]: {
                    value: [{
                        value: {
                            [fieldsCodes.子件明細規格]: { value: 子件規格 },
                            [fieldsCodes.製程]: { value: 製程 },
                            [fieldsCodes.明細處理選單]: { value: 處理選單 },
                            [fieldsCodes.明細單價單位]: { value: 單價 },
                            [fieldsCodes.時間]: { value: 總工時 },
                            [fieldsCodes.加工費用]: { value: 加工費用 },
                            [fieldsCodes.成本]: { value: 成本 }
                        }
                    }]
                }
            };

            await kintone.api(kintone.api.url('/k/v1/record', true), 'POST', {
                app: sheetAppID,
                record: newRecord
            });
        }
    }

    Swal.fire({
        icon: 'success',
        title: '更新完成',
        text: '所有資料已更新完畢',
        confirmButtonText: 'OK',
        footer: `<a href='https://achb.cybozu.com/k/${sheetAppID}/?query=${fieldsCodes.客戶來詢單號}%20in%20("${客戶來詢單號}")' target="_blank" rel="noopener noreferrer">【工程分析單 ${客戶來詢單號}】</a>`
    });
}