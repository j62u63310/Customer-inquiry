import React, { useState, useEffect, useRef } from 'react';
import { SheetComponent } from '@antv/s2-react';
import { setLang, extendLocale, getLang } from '@antv/s2'
import '@antv/s2-react/dist/style.min.css';
import './styles/App.css';
import HiddenInteraction from './interactions/HiddenInteraction';
import { fields, zh_TW } from './utils/fields';
import { fetchAllData, checkOrder, summaryData, updateData} from './utils/fetchData';

const App = () => {
    const [data, setData] = useState([]);
    const sheetRef = useRef(null)

    const s2Options = {
        width: 1870,
        height: 1000,
        interaction: {
            customInteractions: [
                {
                    key: 'HiddenInteraction',
                    interaction: HiddenInteraction,
                },
            ],
            selectedCellsSpotlight: true,
            enableCopy: true,
            copyWithHeader: true,
        },
    };

    const s2DataConfig = {
        fields: fields,
        data: data
    };

    const handleSelectChange = async (event) => {
        setData(await summaryData(event.target.value));
    };

    const handleButtonClick = async () => {
        const spreadsheetData = sheetRef.current.dataCfg.data;
        setData(spreadsheetData);
        await updateData(spreadsheetData);
    };


    useEffect(() => {
        async function initializeDropdown() {
            extendLocale({ 'zh-TW': zh_TW });
            setLang('zh-TW');
            console.log(getLang());
            const toolbar = document.querySelector('.kintone-app-headermenu-space');
            const order = await checkOrder();
            
            if (toolbar) {
                const dropdownContainer = document.createElement('div');
                dropdownContainer.className = 'dropdown-container';
    
                const label = document.createElement('label');
                label.className = 'dropdown-label';
                label.innerText = '選擇單據';
    
                const select = document.createElement('select');
                select.className = 'dropdown-select';

                select.onchange = function(event) {
                    handleSelectChange(event);
                };

                const option = document.createElement('option');
                option.value = "---";
                option.innerText = "---";
                select.appendChild(option);
    
                order.forEach(orderNumber => {
                    const option = document.createElement('option');
                    option.value = orderNumber;
                    option.innerText = orderNumber;
                    select.appendChild(option);
                });

                const button = document.createElement('button');
                button.className = 'dropdown-button';
                button.innerText = '儲存表格';
                button.onclick = handleButtonClick;

    
                dropdownContainer.appendChild(label);
                dropdownContainer.appendChild(select);
                dropdownContainer.appendChild(button);
    
                toolbar.appendChild(dropdownContainer);
            }
        }
        
        initializeDropdown();
    }, []);

    return (
        <div className="app">
            <SheetComponent
                dataCfg={s2DataConfig}
                options={s2Options}
                header= {{
                    exportCfg: {
                        open: true,
                    },
                }}
                className="antv-s2-container"
                ref={sheetRef}
            />
        </div>
    );

}

export default App;