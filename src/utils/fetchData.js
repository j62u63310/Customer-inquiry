const sheetAppID = [175, 174];

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
            for (const appID of sheetAppID) {
                const getRecord = {
                    app: appID,
                    query: `客戶來詢單號 in ("${data.客戶來詢單號.value}")`
                };
                const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', getRecord);
                if (resp.records.length === 0) {
                    allExist = false;
                    break;
                }
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
    
    // 獲取其他應用的記錄
    const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        app: "175",
        query: `客戶來詢單號 in ("${order}")`
    });

    for (const record of resp.records) {
        const baseItem = {
            主件規格: '',
            需求數量: '',
            子件規格: '',
            處理選單: '',
            製程: '',
            "總工時(分)": '',
            單價: '',
            "成本(NTD)": '',
            "加工費用(USD)": ''
        };
        record.製程表格.value.forEach(detail => {
            const item = { ...baseItem };
            item.主件規格 = record.主件規格.value;
            item.需求數量 = record.數量.value;
            item.子件規格 = record.子件規格_1.value;
            item.處理選單 = record.處理選單_0.value;
            item.單價 = record.單價_單位_0.value;

            item.製程 = detail.value.製程 ? detail.value.製程.value : '';
            item["總工時(分)"] = detail.value.時間 ? detail.value.時間.value : '';
            item["加工費用(USD)"] = detail.value.加工費用_US__ ? detail.value.加工費用_US__.value : '';
            item["成本(NTD)"] = detail.value.成本_NTD_ ? detail.value.成本_NTD_.value : '';
            consolidated.push(item);
        });
    }
    return consolidated;
}

export async function updateData(records){
    for(const record of records){
        const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: "175",
            query: `主件規格 in ("${record.主件規格}") and 子件規格_1 in ("${record.子件規格}") and 數量 in ("${record.需求數量}")`
        });
        if(resp.records.length > 0){
            const data = resp.records[0];
            const tableData = data.製程表格
            for(const row of tableData.value){
                if(row.value.製程.value === record.製程){
                    row.value.時間.value = record["總工時(分)"];
                    row.value.成本_NTD_.value = record["成本(NTD)"];
                    row.value.加工費用_US__.value = record["加工費用(USD)"];
                }
            }
            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
                app: "175",
                id: data.$id.value,
                record:{
                    "製程表格": tableData
                }
            });
        }
    }
}