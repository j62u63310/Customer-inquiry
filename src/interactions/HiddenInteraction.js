import { BaseEvent, S2Event } from '@antv/s2';
import { fields, fieldsCodes } from '../utils/fields';
import { fetchAllData } from '../utils/fetchData';

const sheetAppID = 174;

class HiddenInteraction extends BaseEvent {
    constructor(spreadsheet) {
        super(spreadsheet);
        this.currentInput = null;
        this.onBlur = this.onBlur.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this); // 綁定 onResize 函數
    }

    bindEvents() {
        this.spreadsheet.on(S2Event.GLOBAL_LINK_FIELD_JUMP, async (event) => {
            const key = event.key;
            const record = event.record;
            const 主件規格 = record[fieldsCodes.主件規格];
            const 子件規格 = record[fieldsCodes.子件規格];
            const 處理選單 = record[fieldsCodes.處理選單];
            const 製程 = record[fieldsCodes.製程];
            const 客戶來詢單號 = record[fieldsCodes.客戶來詢單號];
            let query;

            const fetchDataAndOpenWindow = async (query, type) => {
                const data = await kintone.api(kintone.api.url('/k/v1/records', true),'GET',{
                    app: sheetAppID,
                    query: query
                });
                if (data.records.length > 1) {
                    window.open(`https://achb.cybozu.com/k/${sheetAppID}/?query=${query}`, '_blank');
                } else if (data.records.length === 1) {
                    window.open(`https://achb.cybozu.com/k/${sheetAppID}/show#record=${data.records[0].$id.value}`, '_blank');
                }
            };

            if (key === fieldsCodes.子件規格) {
                query = `${fieldsCodes.客戶來詢單號} in ("${客戶來詢單號}") and ${fieldsCodes.主件規格} in ("${主件規格}") and ${fieldsCodes.子件明細規格} in ("${子件規格}")`;
                fetchDataAndOpenWindow(query, '子件規格');
            } else if (key === fieldsCodes.處理選單) {
                query = `${fieldsCodes.客戶來詢單號} in ("${客戶來詢單號}") and ${fieldsCodes.主件規格} in ("${主件規格}") and ${fieldsCodes.子件明細規格} in ("${子件規格}") and ${fieldsCodes.明細處理選單} in ("${處理選單}")`;
                fetchDataAndOpenWindow(query, '處理選單');
            } else if (key === fieldsCodes.製程) {
                query = `${fieldsCodes.客戶來詢單號} in ("${客戶來詢單號}") and ${fieldsCodes.主件規格} in ("${主件規格}") and ${fieldsCodes.子件明細規格} in ("${子件規格}") and ${fieldsCodes.明細處理選單} in ("${處理選單}") and ${fieldsCodes.製程} in ("${製程}")`;
                fetchDataAndOpenWindow(query, '製程');
            }
        });

        this.spreadsheet.on(S2Event.DATA_CELL_CLICK, (event) => {
            if (this.currentInput) {
                this.saveAndRemoveInput();
            }
        });

        this.spreadsheet.on(S2Event.DATA_CELL_DOUBLE_CLICK, (event) => {
            if (this.currentInput) {
                this.saveAndRemoveInput();
            }

            this.spreadsheet.hideTooltip();

            const containerElement = document.querySelector('.antv-s2-container');
            if (!containerElement) return;

            const containerX = containerElement.getBoundingClientRect().x + 2;
            const containerY = containerElement.getBoundingClientRect().y + 2;
            const cell = this.spreadsheet.getCell(event.target);
            const meta = cell ? cell.getMeta() : null;

            if (cell && meta) {
                const minLeft = this.spreadsheet.facet.layoutResult.rowsHierarchy.width;
                const bbox = cell.cfg.cacheCanvasBBox;
                const input = document.createElement("input");
                const leftPosition = bbox.x + containerX + window.scrollX < minLeft ? minLeft + containerX : bbox.x + containerX;
                const topPosition = bbox.y + containerY;

                input.type = "text";
                input.value = meta.fieldValue || "";
                input.className = "custom-input";
                input.style.position = "absolute";
                input.style.left = `${leftPosition + window.scrollX}px`;
                input.style.top = `${topPosition + window.scrollY}px`;
                input.style.width = `${bbox.x + containerX + window.scrollX < minLeft ? bbox.width - 4 - (minLeft - bbox.x) : Math.min(bbox.width - 4, this.spreadsheet.container.cfg.width - bbox.x - 4)}px`;
                input.style.height = `${bbox.height - 4}px`;
                document.body.appendChild(input);
                input.focus();

                this.currentInput = { input, cell, bbox, meta };

                input.addEventListener("blur", this.onBlur);
                this.spreadsheet.on(S2Event.GLOBAL_SCROLL, this.onScroll);
                this.spreadsheet.on(S2Event.LAYOUT_RESIZE, this.onResize);
            }
        });
    }

    saveAndRemoveInput() {
        const { input, meta } = this.currentInput;
        const newValue = input.value;
    
        // 查找資料索引
        const dataIndex = this.spreadsheet.dataCfg.data.findIndex(row =>
            fields.rows.every(field => row[field] === meta.rowQuery[field]) &&
            fields.columns.every(field => row[field] === meta.colQuery[field])
        );
    
        let total = 0;
        let 數量;
    
        const newData = [...this.spreadsheet.dataCfg.data];
    
        if (dataIndex !== -1) {
            // 如果找到匹配的行，獲取需求數量並更新該行
            數量 = newData[dataIndex]["需求數量"];
            newData[dataIndex] = { ...newData[dataIndex], [meta.valueField]: newValue };
        } else {
            // 如果沒有找到匹配的行，新增一行並設置需求數量
            const newRow = {};
            fields.rows.forEach(field => {
                newRow[field] = meta.rowQuery[field];
            });
    
            fields.columns.forEach(field => {
                newRow[field] = meta.colQuery[field];
            });
    
            fields.values.forEach(valueField => {
                newRow[valueField] = valueField === meta.valueField ? newValue : null;
            });
    
            const existingRow = this.spreadsheet.dataCfg.data.find(row => row["客戶來詢單號"]);
            if (existingRow) {
                newRow["客戶來詢單號"] = existingRow["客戶來詢單號"];
            } else {
                newRow["客戶來詢單號"] = "預設單號"; // 或其他處理方式
            }

            console.log(newRow);
    
            // 設置需求數量
            數量 = newRow["需求數量"];
    
            newData.push({ ...newRow, [meta.valueField]: newValue });
        }

    
        // 計算總金額
        for (const data of newData) {
            if (data["需求數量"] == 數量) {
                total += parseInt(data["加工費用(USD)"] || 0, 10);
            }
        }
    
        // 更新總金額
        for (const data of newData) {
            if (data["需求數量"] == 數量) {
                data["總金額"] = total.toString();
            }
        }
    
        // 更新資料配置並重新渲染表格
        this.spreadsheet.setDataCfg({ ...this.spreadsheet.dataCfg, data: newData });
        this.spreadsheet.render();
    
        // 移除輸入
        this.removeInput();
    }

    onBlur() {
        this.saveAndRemoveInput();
    }

    onScroll() {
        if (this.currentInput) {
            this.saveAndRemoveInput();
        }
    }

    onResize() {
        if (this.currentInput) {
            this.saveAndRemoveInput();
        }
    }

    removeInput() {
        if (this.currentInput) {
            const { input } = this.currentInput;
            try {
                input.removeEventListener("blur", this.onBlur);
                this.spreadsheet.off(S2Event.GLOBAL_SCROLL, this.onScroll);
                this.spreadsheet.off(S2Event.LAYOUT_RESIZE, this.onResize); // 移除 LAYOUT_RESIZE 事件处理程序
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
            } catch (error) {
                console.error('Error removing input:', error);
            }
            this.currentInput = null;
        }
    }
}

export default HiddenInteraction;
