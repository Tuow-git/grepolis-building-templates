// ==UserScript==
// @name         BouwHelper
// @version      0.2
// @description  Automatically provides visual hints for building requirements when building overview is loaded
// @author       Tuow
// @include      https://*.grepolis.com/game/*
// @exclude      forum.*.grepolis.*/*
// @exclude      wiki.*.grepolis.*/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';

    // Convert array to object for faster lookups
    const buildingSpecs = new Map(
        [
            ['academy', { minLevel: 0, maxLevel: 36, requirements: { main: 8, farm: 6, barracks: 5 } }],
            ['barracks', { minLevel: 0, maxLevel: 30, requirements: { main: 2, farm: 3, ironer: 1 } }],
            ['docks', { minLevel: 0, maxLevel: 30, requirements: { main: 14, lumber: 15, ironer: 10 } }],
            ['farm', { minLevel: 0, maxLevel: 45, requirements: {} }],
            ['hide', { minLevel: 0, maxLevel: 10, requirements: { main: 10, storage: 7, market: 4 } }],
            ['ironer', { minLevel: 0, maxLevel: 40, requirements: { lumber: 1 } }],
            ['library', { minLevel: 0, maxLevel: 1, requirements: { main: 24, docks: 5, academy: 20 }, place: 'left' }],
            ['lighthouse', { minLevel: 0, maxLevel: 1, requirements: { main: 24, docks: 20, academy: 5 }, place: 'left' }],
            ['lumber', { minLevel: 0, maxLevel: 40, requirements: {} }],
            ['main', { minLevel: 0, maxLevel: 25, requirements: {} }],
            ['market', { minLevel: 0, maxLevel: 30, requirements: { main: 3, storage: 5 } }],
            ['oracle', { minLevel: 0, maxLevel: 1, requirements: { main: 21, hide: 10, temple: 5, market: 5 }, place: 'right' }],
            ['statue', { minLevel: 0, maxLevel: 1, requirements: { main: 21, temple: 12, market: 5 }, place: 'right' }],
            ['stoner', { minLevel: 0, maxLevel: 40, requirements: {} }],
            ['storage', { minLevel: 0, maxLevel: 35, requirements: {} }],
            ['temple', { minLevel: 0, maxLevel: 30, requirements: { main: 1, stoner: 1 } }],
            ['theater', { minLevel: 0, maxLevel: 1, requirements: { main: 24, lumber: 35, ironer: 32, docks: 5 }, place: 'left' }],
            ['thermal', { minLevel: 0, maxLevel: 1, requirements: { senate: 24, farm: 35, docks: 5 }, place: 'left' }],
            ['tower', { minLevel: 0, maxLevel: 1, requirements: { main: 21, wall: 20, temple: 5, market: 5 }, place: 'right' }],
            ['trade_office', { minLevel: 0, maxLevel: 1, requirements: { main: 21, market: 15, temple: 5 }, place: 'right' }],
            ['wall', { minLevel: 0, maxLevel: 25, requirements: { main: 5, temple: 3 } }]
        ]
    );

    // Debounce function to limit the rate at which a function can fire
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Building color update function
    const updateBuildingColors = debounce(() => {
        try {
            const towns = ITowns.getTowns();
            const townGroups = ITowns.getTownGroups();

            if (typeof townGroups === 'object' && townGroups !== null) {
                Object.entries(townGroups).forEach(([groupId, townGroup]) => {
                    const storedTemplate = localStorage.getItem(`buildingTemplate_${groupId}`);
                    if (storedTemplate) {
                        const desiredBuildings = JSON.parse(storedTemplate);

                        const processTown = (town) => {
                            let townId = typeof town === 'object' ? town.id : town;
                            if (towns[townId]) {
                                const buildings = towns[townId].buildings().attributes;
                                
                                // Reset all building colors
                                $(`#building_overview tr#ov_town_${townId} td`).css('background-color', '');

                                // Check if desired special buildings are built
                                const leftSpecialBuilt = Array.from(buildingSpecs.values()).some(spec => 
                                    spec.place === 'left' && desiredBuildings[spec.building] > 0 && buildings[spec.building] > 0
                                );
                                const rightSpecialBuilt = Array.from(buildingSpecs.values()).some(spec => 
                                    spec.place === 'right' && desiredBuildings[spec.building] > 0 && buildings[spec.building] > 0
                                );

                                // Color buildings based on template and requirements
                                buildingSpecs.forEach((spec, building) => {
                                    const cell = $(`#building_overview tr#ov_town_${townId} td.${building}`);
                                    const currentLevel = buildings[building];
                                    const desiredLevel = desiredBuildings[building];

                                    if (desiredLevel !== undefined) {
                                        if (currentLevel < desiredLevel) {
                                            cell.css('background-color', '#90EE90'); // Light green for upgrade
                                            
                                            // Check and color requirements
                                            Object.entries(spec.requirements).forEach(([reqBuilding, reqLevel]) => {
                                                const reqCell = $(`#building_overview tr#ov_town_${townId} td.${reqBuilding}`);
                                                if (buildings[reqBuilding] < reqLevel) {
                                                    reqCell.css('background-color', '#90EE90');
                                                }
                                            });
                                        } else if (currentLevel > desiredLevel) {
                                            if (spec.place) {
                                                cell.css('background-color', '#FF6347'); // Red for demolish special buildings
                                            } else if (building === 'main' && (leftSpecialBuilt || rightSpecialBuilt)) {
                                                cell.css('background-color', '#FF6347'); // Red for demolish main if special building is built
                                            } else if (building !== 'main' && leftSpecialBuilt && rightSpecialBuilt) {
                                                cell.css('background-color', '#FF6347'); // Red for demolish if both special buildings are built
                                            } else {
                                                cell.css('background-color', '#FFA500'); // Orange for downgrade
                                            }
                                        }
                                    }
                                });

                                // Additional pass to ensure all required buildings are highlighted
                                buildingSpecs.forEach((spec, building) => {
                                    const desiredLevel = desiredBuildings[building];
                                    if (desiredLevel !== undefined && buildings[building] < desiredLevel) {
                                        Object.entries(spec.requirements).forEach(([reqBuilding, reqLevel]) => {
                                            const reqCell = $(`#building_overview tr#ov_town_${townId} td.${reqBuilding}`);
                                            if (buildings[reqBuilding] < reqLevel) {
                                                reqCell.css('background-color', '#90EE90');
                                            }
                                        });
                                    }
                                });
                            }
                        };

                        // Process towns
                        if (Array.isArray(townGroup.towns)) {
                            townGroup.towns.forEach(processTown);
                        } else if (typeof townGroup.towns === 'object') {
                            Object.values(townGroup.towns).forEach(processTown);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error in updateBuildingColors:', error);
        }
    }, 250);

    // Building templates button function
    const addBuildingTemplatesButton = () => {
        if (document.getElementById('building_templates_button')) {
            return; // Button already exists, no need to add it again
        }

        const gameListFooter = document.querySelector('.game_list_footer');
        if (gameListFooter) {
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
        }
    };

    // Building templates window function
    const createBuildingTemplatesWindow = () => {
        GPWindowMgr.Create(GPWindowMgr.TYPE_DIALOG, "Building Templates");
        const window = GPWindowMgr.getOpenFirst(GPWindowMgr.TYPE_DIALOG);
        window.setPosition(['center', 'center']);
        window.setSize(700, 500);

        const townGroups = ITowns.getTownGroups();

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = 'display: flex; flex-direction: column;';

        // Create top row for dropdowns and save button
        const topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 10px;';

        // Create dropdown select for town groups
        const selectElement = document.createElement('select');
        selectElement.id = 'town-group-select';
        selectElement.style.cssText = 'flex-grow: 1; margin-right: 10px;';

        // Add default option
        selectElement.innerHTML = '<option value="">Select a town group</option>';

        // Add options for each town group
        Object.entries(townGroups).forEach(([id, group]) => {
            if (id !== '-1' && id !== '-2') {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = group.name;
                selectElement.appendChild(option);
            }
        });

        // Create dropdown for default templates
        const defaultTemplateSelect = document.createElement('select');
        defaultTemplateSelect.id = 'default-template-select';
        defaultTemplateSelect.style.cssText = 'flex-grow: 1; margin-right: 10px;';
        defaultTemplateSelect.innerHTML = `
            <option value="">Select a default template</option>
            <option value="nuke">Nuke</option>
            <option value="theater">Theater</option>
        `;

        // Create save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Group Template';
        saveButton.className = 'button_new';
        saveButton.style.cssText = 'padding: 5px 10px;';

        // Add elements to top row
        topRow.appendChild(selectElement);
        topRow.appendChild(defaultTemplateSelect);
        topRow.appendChild(saveButton);

        // Add top row to content
        content.appendChild(topRow);

        // Create a container for building icons and inputs
        const buildingIconsContainer = document.createElement('div');
        buildingIconsContainer.id = 'building-icons-container';
        buildingIconsContainer.style.cssText = 'display: flex; flex-wrap: wrap; max-height: 400px; overflow-y: auto;';
        content.appendChild(buildingIconsContainer);

        // Default templates
        const defaultTemplates = {
            nuke: {
                thermal: 1, main: 10, farm: 45, hide: 0, lumber: 1, ironer: 1, stoner: 1, storage: 35
            },
            theater: {
                theater: 1, main: 10, farm: 45, hide: 10, lumber: 40, ironer: 40, stoner: 40, storage: 35, trade_office: 1
            }
        };

        // Function to load template from localStorage
        const loadTemplate = (groupId) => {
            const savedTemplate = localStorage.getItem(`buildingTemplate_${groupId}`);
            return savedTemplate ? JSON.parse(savedTemplate) : null;
        };

        // Function to validate and update inputs
        const validateAndUpdateInputs = (place) => {
            const inputs = document.querySelectorAll(`input[data-place="${place}"]`);
            let levelOneCount = 0;
            inputs.forEach(input => {
                if (parseInt(input.value) === 1) {
                    levelOneCount++;
                }
            });
            if (levelOneCount > 1) {
                inputs.forEach(input => {
                    if (parseInt(input.value) === 1) {
                        input.value = '0';
                    }
                });
                alert(`Only one ${place} place building can be at level 1.`);
            }
        };

        // Function to populate building levels
        const populateBuildingLevels = (template) => {
            buildingSpecs.forEach((building, buildingName) => {
                const levelInput = document.getElementById(`level-input-${buildingName}`);
                if (levelInput) {
                    levelInput.value = template[buildingName];
                }
            });
        };

        // Event listener for town group dropdown change
        selectElement.addEventListener('change', (event) => {
            buildingIconsContainer.innerHTML = ''; // Clear previous icons

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

                    // Set value from saved template if it exists
                    if (savedTemplate && savedTemplate[buildingName] !== undefined) {
                        levelInput.value = savedTemplate[buildingName];
                    }

                    buildingIconsContainer.appendChild(buildingRow);
                });
            }
        });

        // Event listener for default template dropdown change
        defaultTemplateSelect.addEventListener('change', (event) => {
            const selectedTemplate = event.target.value;
            if (selectedTemplate && defaultTemplates[selectedTemplate]) {
                populateBuildingLevels(defaultTemplates[selectedTemplate]);
            }
        });

        // Event listener for save button
        saveButton.addEventListener('click', () => {
            const selectedGroup = selectElement.value;
            if (selectedGroup) {
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
            } else {
                alert('Please select a town group');
            }
        });

        window.setContent2(content);
    };

    // Function to check if building overview is loaded and update colors
    const checkBuildingOverviewLoaded = debounce(() => {
        const buildingOverview = document.getElementById('building_overview_table_wrapper');
        if (buildingOverview) {
            updateBuildingColors();
            addBuildingTemplatesButton();
        }
    }, 250);

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(mutation => mutation.type === 'childList')) {
            checkBuildingOverviewLoaded();
        }
    });

    // Start observing the document with the configured parameters
    const startObserving = () => {
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // Initialize the script
    const init = () => {
        startObserving();
        checkBuildingOverviewLoaded();

        // Listen for AJAX completions
        document.addEventListener('gpajax:complete', (e) => {
            if (e.detail && e.detail.controller === 'building_place') {
                checkBuildingOverviewLoaded();
            }
        });
    };

    // Run the initialization
    init();
})();