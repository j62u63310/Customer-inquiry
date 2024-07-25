import { BaseEvent, S2Event } from '@antv/s2';
import { fields } from '../utils/fields';

class HiddenInteraction extends BaseEvent {
    constructor(spreadsheet) {
        super(spreadsheet);
        this.currentInput = null;
        this.onBlur = this.onBlur.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this); // 綁定 onResize 函數
    }

    bindEvents() {
        this.spreadsheet.on(S2Event.DATA_CELL_CLICK, (event) => {
            if (this.currentInput) {
                this.removeInput();
            }

            const cell = this.spreadsheet.getCell(event.target);
            const meta = cell ? cell.getMeta() : null;
            if (cell && meta) {
                const rowPosition = fields.rows.map(field => `${field}: ${meta.rowQuery[field]}`).join(', ');
                const colPosition = fields.columns.map(field => `${field}: ${meta.colQuery[field]}`).join(', ');
                const tooltipContent = `${colPosition}\n${rowPosition}\n${meta.valueField}: ${meta.fieldValue || '-'}`;

                this.spreadsheet.showTooltip({
                    position: { x: event.clientX, y: event.clientY },
                    content: tooltipContent,
                    containerClassName: 'antv-s2-tooltip-container'
                });
            }
        });

        this.spreadsheet.on(S2Event.DATA_CELL_DOUBLE_CLICK, (event) => {
            if (this.currentInput) {
                this.removeInput();
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
                input.type = "text";
                input.value = meta.fieldValue || "";
                input.className = "custom-input";
                input.style.position = "absolute";
                input.style.left = `${bbox.x + containerX < minLeft ? minLeft + containerX : bbox.x + containerX}px`;
                input.style.top = `${bbox.y + containerY}px`;
                input.style.width = `${bbox.x + containerX < minLeft ? bbox.width - 4 - (minLeft - bbox.x) : Math.min(bbox.width - 4, this.spreadsheet.container.cfg.width - bbox.x - 4)}px`; // 调整宽度
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

    onBlur() {
        const { input, meta } = this.currentInput;
        const newValue = input.value;

        this.removeInput();

        if (newValue !== null && newValue.trim() !== "") {
            const dataIndex = this.spreadsheet.dataCfg.data.findIndex(row =>
                fields.rows.every(field => row[field] === meta.rowQuery[field]) &&
                fields.columns.every(field => row[field] === meta.colQuery[field])
            );

            const newData = [...this.spreadsheet.dataCfg.data];

            if (dataIndex !== -1) {
                newData[dataIndex] = { ...newData[dataIndex], [meta.valueField]: newValue };
            } else {
                const newRow = {};
                fields.rows.forEach(field => {
                    newRow[field] = meta.rowQuery[field];
                });
                fields.columns.forEach(field => {
                    newRow[field] = meta.colQuery[field];
                });
                fields.values.forEach(valueField => {
                    newRow[valueField] = valueField === meta.valueField ? newValue : newData[dataIndex][valueField];
                });

                newData.push({ ...newRow, [meta.valueField]: newValue });
            }

            this.spreadsheet.setDataCfg({ ...this.spreadsheet.dataCfg, data: newData });
            this.spreadsheet.render();
        }
    }

    onScroll() {
        if (this.currentInput) {
            this.removeInput();
        }
    }

    onResize() {
        if (this.currentInput) {
            this.removeInput();
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
