// ==UserScript==
// @name         BouwHelper
// @version      0.3
// @description  Automatically provides visual hints for building requirements when building overview is loaded
// @author       Tuow (optimized by Assistant)
// @include      https://*.grepolis.com/game/*
// @exclude      forum.*.grepolis.*/*
// @exclude      wiki.*.grepolis.*/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';

    const buildingSpecs = new Map([
        ['academy', { maxLevel: 36, requirements: { main: 8, farm: 6, barracks: 5 } }],
        ['barracks', { maxLevel: 30, requirements: { main: 2, farm: 3, ironer: 1 } }],
        ['docks', { maxLevel: 30, requirements: { main: 14, lumber: 15, ironer: 10 } }],
        ['farm', { maxLevel: 45, requirements: {} }],
        ['hide', { maxLevel: 10, requirements: { main: 10, storage: 7, market: 4 } }],
        ['ironer', { maxLevel: 40, requirements: { lumber: 1 } }],
        ['library', { maxLevel: 1, requirements: { main: 24, docks: 5, academy: 20 }, place: 'left' }],
        ['lighthouse', { maxLevel: 1, requirements: { main: 24, docks: 20, academy: 5 }, place: 'left' }],
        ['lumber', { maxLevel: 40, requirements: {} }],
        ['main', { maxLevel: 25, requirements: {} }],
        ['market', { maxLevel: 30, requirements: { main: 3, storage: 5 } }],
        ['oracle', { maxLevel: 1, requirements: { main: 21, hide: 10, temple: 5, market: 5 }, place: 'right' }],
        ['statue', { maxLevel: 1, requirements: { main: 21, temple: 12, market: 5 }, place: 'right' }],
        ['stoner', { maxLevel: 40, requirements: {} }],
        ['storage', { maxLevel: 35, requirements: {} }],
        ['temple', { maxLevel: 30, requirements: { main: 1, stoner: 1 } }],
        ['theater', { maxLevel: 1, requirements: { main: 24, lumber: 35, ironer: 32, docks: 5 }, place: 'left' }],
        ['thermal', { maxLevel: 1, requirements: { senate: 24, farm: 35, docks: 5 }, place: 'left' }],
        ['tower', { maxLevel: 1, requirements: { main: 21, wall: 20, temple: 5, market: 5 }, place: 'right' }],
        ['trade_office', { maxLevel: 1, requirements: { main: 21, market: 15, temple: 5 }, place: 'right' }],
        ['wall', { maxLevel: 25, requirements: { main: 5, temple: 3 } }]
    ]);

    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    const updateBuildingColors = debounce(() => {
        const towns = ITowns.getTowns();
        const townGroups = ITowns.getTownGroups();

        Object.entries(townGroups).forEach(([groupId, townGroup]) => {
            const storedTemplate = localStorage.getItem(`buildingTemplate_${groupId}`);
            if (!storedTemplate) return;

            const desiredBuildings = JSON.parse(storedTemplate);

            const processTown = (town) => {
                const townId = typeof town === 'object' ? town.id : town;
                if (!towns[townId]) return;

                const buildings = towns[townId].buildings().attributes;
                const $townRow = $(`#building_overview tr#ov_town_${townId}`);
                
                $townRow.find('td').css('background-color', '');

                const leftSpecialBuilt = Array.from(buildingSpecs.values()).some(spec => 
                    spec.place === 'left' && desiredBuildings[spec.building] > 0 && buildings[spec.building] > 0
                );
                const rightSpecialBuilt = Array.from(buildingSpecs.values()).some(spec => 
                    spec.place === 'right' && desiredBuildings[spec.building] > 0 && buildings[spec.building] > 0
                );

                buildingSpecs.forEach((spec, building) => {
                    const currentLevel = buildings[building];
                    const desiredLevel = desiredBuildings[building];

                    if (desiredLevel === undefined) return;

                    const $cell = $townRow.find(`td.${building}`);
                    
                    if (currentLevel < desiredLevel) {
                        $cell.css('background-color', '#90EE90');
                        Object.entries(spec.requirements).forEach(([reqBuilding, reqLevel]) => {
                            if (buildings[reqBuilding] < reqLevel) {
                                $townRow.find(`td.${reqBuilding}`).css('background-color', '#90EE90');
                            }
                        });
                    } else if (currentLevel > desiredLevel) {
                        if (spec.place || 
                            (building === 'main' && (leftSpecialBuilt || rightSpecialBuilt)) ||
                            (building !== 'main' && leftSpecialBuilt && rightSpecialBuilt)) {
                            $cell.css('background-color', '#FF6347');
                        } else {
                            $cell.css('background-color', '#FFA500');
                        }
                    }
                });
            };

            if (Array.isArray(townGroup.towns)) {
                townGroup.towns.forEach(processTown);
            } else if (typeof townGroup.towns === 'object') {
                Object.values(townGroup.towns).forEach(processTown);
            }
        });
    }, 250);

    const addBuildingTemplatesButton = () => {
        if (document.getElementById('building_templates_button')) return;

        const gameListFooter = document.querySelector('.game_list_footer');
        if (!gameListFooter) return;

        const buildingTemplatesButton = document.createElement('div');
        buildingTemplatesButton.id = 'building_templates_button';
        buildingTemplatesButton.className = 'button_new';
        buildingTemplatesButton.style.cssText = 'margin-top: 5px; display: inline-block;';

        buildingTemplatesButton.innerHTML = `
            <div class="left"></div>
            <div class="right"></div>
            <div class="caption js-caption">
                <span>Building Templates</span>
                <div class="effect js-effect"></div>
            </div>
        `;

        buildingTemplatesButton.addEventListener('click', createBuildingTemplatesWindow);
        gameListFooter.appendChild(buildingTemplatesButton);
    };

    const createBuildingTemplatesWindow = () => {
        const window = GPWindowMgr.Create(GPWindowMgr.TYPE_DIALOG, "Building Templates");
        window.setPosition(['center', 'center']);
        window.setSize(700, 500);

        const townGroups = ITowns.getTownGroups();

        const content = document.createElement('div');
        content.style.cssText = 'display: flex; flex-direction: column;';

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 10px;';

        const selectElement = document.createElement('select');
        selectElement.id = 'town-group-select';
        selectElement.style.cssText = 'flex-grow: 1; margin-right: 10px;';
        selectElement.innerHTML = '<option value="">Select a town group</option>';

        Object.entries(townGroups).forEach(([id, group]) => {
            if (id !== '-1' && id !== '-2') {
                selectElement.innerHTML += `<option value="${id}">${group.name}</option>`;
            }
        });

        const defaultTemplateSelect = document.createElement('select');
        defaultTemplateSelect.id = 'default-template-select';
        defaultTemplateSelect.style.cssText = 'flex-grow: 1; margin-right: 10px;';
        defaultTemplateSelect.innerHTML = `
            <option value="">Select a default template</option>
            <option value="nuke">Nuke</option>
            <option value="theater">Theater</option>
        `;

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Group Template';
        saveButton.className = 'button_new';
        saveButton.style.cssText = 'padding: 5px 10px;';

        topRow.append(selectElement, defaultTemplateSelect, saveButton);
        content.appendChild(topRow);

        const buildingIconsContainer = document.createElement('div');
        buildingIconsContainer.id = 'building-icons-container';
        buildingIconsContainer.style.cssText = 'display: flex; flex-wrap: wrap; max-height: 400px; overflow-y: auto;';
        content.appendChild(buildingIconsContainer);

        const defaultTemplates = {
            nuke: { thermal: 1, main: 10, farm: 45, hide: 0, lumber: 1, ironer: 1, stoner: 1, storage: 35 },
            theater: { theater: 1, main: 10, farm: 45, hide: 10, lumber: 40, ironer: 40, stoner: 40, storage: 35, trade_office: 1 }
        };

        const loadTemplate = (groupId) => {
            const savedTemplate = localStorage.getItem(`buildingTemplate_${groupId}`);
            return savedTemplate ? JSON.parse(savedTemplate) : null;
        };

        const validateAndUpdateInputs = (place) => {
            const inputs = document.querySelectorAll(`input[data-place="${place}"]`);
            const levelOneCount = Array.from(inputs).filter(input => parseInt(input.value) === 1).length;
            if (levelOneCount > 1) {
                inputs.forEach(input => {
                    if (parseInt(input.value) === 1) input.value = '0';
                });
                alert(`Only one ${place} place building can be at level 1.`);
            }
        };

        const populateBuildingLevels = (template) => {
            buildingSpecs.forEach((building, buildingName) => {
                const levelInput = document.getElementById(`level-input-${buildingName}`);
                if (levelInput) levelInput.value = template[buildingName] || '';
            });
        };

        selectElement.addEventListener('change', (event) => {
            buildingIconsContainer.innerHTML = '';

            if (event.target.value) {
                const savedTemplate = loadTemplate(event.target.value);

                buildingSpecs.forEach((building, buildingName) => {
                    const buildingRow = document.createElement('div');
                    buildingRow.style.cssText = 'display: flex; align-items: center; margin: 5px; width: 100%;';

                    buildingRow.innerHTML = `
                        <div class="building_header building_icon40x40 ${buildingName} regular" id="icon_building_${buildingName}" style="margin-right: 10px;"></div>
                        <span style="flex-grow: 1; margin-right: 10px;">${buildingName.charAt(0).toUpperCase() + buildingName.slice(1)}</span>
                        <input type="number" id="level-input-${buildingName}" min="0" max="${building.maxLevel}" placeholder="Level" style="width: 50px;">
                    `;

                    const levelInput = buildingRow.querySelector(`#level-input-${buildingName}`);

                    if (building.place) {
                        levelInput.dataset.place = building.place;
                        levelInput.addEventListener('change', () => validateAndUpdateInputs(building.place));
                    }

                    if (savedTemplate && savedTemplate[buildingName] !== undefined) {
                        levelInput.value = savedTemplate[buildingName];
                    }

                    buildingIconsContainer.appendChild(buildingRow);
                });
            }
        });

        defaultTemplateSelect.addEventListener('change', (event) => {
            const selectedTemplate = event.target.value;
            if (selectedTemplate && defaultTemplates[selectedTemplate]) {
                populateBuildingLevels(defaultTemplates[selectedTemplate]);
            }
        });

        saveButton.addEventListener('click', () => {
            const selectedGroup = selectElement.value;
            if (!selectedGroup) {
                alert('Please select a town group');
                return;
            }

            const template = {};
            let leftPlaceCount = 0;
            let rightPlaceCount = 0;

            buildingSpecs.forEach((building, buildingName) => {
                const levelInput = document.getElementById(`level-input-${buildingName}`);
                if (levelInput && levelInput.value !== '') {
                    const level = parseInt(levelInput.value, 10);
                    template[buildingName] = level;

                    if (building.place === 'left' && level === 1) leftPlaceCount++;
                    if (building.place === 'right' && level === 1) rightPlaceCount++;
                }
            });

            if (leftPlaceCount > 1 || rightPlaceCount > 1) {
                alert('Only one building on each side can be at level 1.');
                return;
            }

            localStorage.setItem(`buildingTemplate_${selectedGroup}`, JSON.stringify(template));
            console.log(`Saved template for group ${selectedGroup}:`, template);
        });

        window.setContent2(content);
    };

    const checkBuildingOverviewLoaded = debounce(() => {
        const buildingOverview = document.getElementById('building_overview_table_wrapper');
        if (buildingOverview) {
            updateBuildingColors();
            addBuildingTemplatesButton();
        }
    }, 250);

    const observer = new MutationObserver((mutations) => {
        if (mutations.some(mutation => mutation.type === 'childList')) {
            checkBuildingOverviewLoaded();
        }
    });

    const init = () => {
        observer.observe(document.body, { childList: true, subtree: true });
        checkBuildingOverviewLoaded();

        document.addEventListener('gpajax:complete', (e) => {
            if (e.detail && e.detail.controller === 'building_place') {
                checkBuildingOverviewLoaded();
            }
        });
    };

    init();
})();