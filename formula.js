const hamburgerMenu = document.getElementById('hamburger-menu');
const hamburgerItems = document.getElementById('hamburger-items');

hamburgerMenu.addEventListener('click', () => {
    hamburgerItems.classList.toggle('show');
});
// Function to apply Uppercase to the content of a cell
function applyUpper() {
    const address = addressInput.value; // e.g., "A1"
    const { rId, cId } = getRidCid(address);
    const cell = document.querySelector(`.grid .cell[rid='${rId}'][cid='${cId}']`);

    if (cell) {
        const currentValue = cell.textContent;
        const uppercasedValue = currentValue.toUpperCase();
        cell.textContent = uppercasedValue;

        // Update the value in the database (db) as well
        db[rId][cId].value = uppercasedValue;
    }
}

// Function to apply Lowercase to the content of a cell
function applyLower() {
    const address = addressInput.value;
    const { rId, cId } = getRidCid(address);
    const cell = document.querySelector(`.grid .cell[rid='${rId}'][cid='${cId}']`);

    if (cell) {
        const currentValue = cell.textContent;
        const lowercasedValue = currentValue.toLowerCase();
        cell.textContent = lowercasedValue;

        // Update the value in the database (db) as well
        db[rId][cId].value = lowercasedValue;
    }
}

// Utility function to get selected range of cells
function getSelectedRange() {
    let rangeInput = prompt("Enter cell range (e.g., A1:A4):");
    if (!rangeInput) return [];

    let [startCell, endCell] = rangeInput.split(":");
    let { rId: startRow, cId: startCol } = getRidCid(startCell);
    let { rId: endRow, cId: endCol } = getRidCid(endCell);

    let selectedCells = [];
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            let cell = document.querySelector(`.grid .cell[rid='${r}'][cid='${c}']`);
            if (cell) selectedCells.push(cell);
        }
    }
    return selectedCells;
}

// Ensure that other parts of the code that use getRidCid handle potential errors gracefully.


// Cell -> formula remove / value set 
for (let i = 0; i < allCells.length; i++) {
    allCells[i].addEventListener("blur", function cellHelper(e) {
        let content = allCells[i].textContent;
        let address = addressInput.value;
        let { rId, cId } = getRidCid(address);
        let cellObject = db[rId][cId];

        if (cellObject.value == content) {
            return;
        }
        if (cellObject.formula) {
            removeFormula(address, cellObject.formula);
            cellObject.formula = "";
        }
        SolveUI(content, rId, cId);
    });
}

formulaInput.addEventListener("keydown", function (e) {
    if (e.key == "Enter" && formulaInput.value != "") {
        let cFormula = formulaInput.value;
        let address = addressInput.value;
        let { rId, cId } = getRidCid(address);
        let cellObject = db[rId][cId];

        if (cellObject.formula != cFormula) {
            removeFormula(address, cellObject.formula);
        }

        let value = evaluateFormula(cFormula);
        SolveUI(value, rId, cId);
        db[rId][cId].formula = cFormula;
        setFormula(address, cFormula);
    }
});

// Evaluates formulas including SUM, AVERAGE, MAX, MIN, COUNT
function evaluateFormula(formula) {
    let functionMatch = formula.match(/^([A-Z]+)\((.*?)\)$/); // Check for function format

    if (functionMatch) {
        let functionName = functionMatch[1]; // SUM, AVERAGE, etc.
        let range = functionMatch[2]; // A1:A4
        
        let values = getRangeValues(range); // Extract values from the range

        switch (functionName) {
            case "SUM":
                return values.reduce((acc, val) => acc + val, 0);
            case "AVERAGE":
                return values.length > 0 ? values.reduce((acc, val) => acc + val, 0) / values.length : 0;
            case "MAX":
                return values.length > 0 ? Math.max(...values) : "Error";
            case "MIN":
                return values.length > 0 ? Math.min(...values) : "Error";
            case "COUNT":
                return values.length;
            default:
                return "Error";
        }
    }

    let formulaA = formula.split(" "); // e.g., ['(', 'A1', '+', 'A2' ,')']
    for (let i = 0; i < formulaA.length; i++) {
        let ASCI = formulaA[i].charCodeAt(0);
        if (ASCI >= 65 && ASCI <= 90) { // A1, B2, etc.
            let { rId, cId } = getRidCid(formulaA[i]);
            let value = db[rId][cId].value;
            formula = formula.replace(formulaA[i], value);
        }
    }
    
    return eval(formula); // Evaluate math expressions
}

// Get values from a cell range (e.g., A1:A4)
function getRangeValues(range) {
    let [startCell, endCell] = range.split(":");
    let { rId: startRow, cId: startCol } = getRidCid(startCell);
    let { rId: endRow, cId: endCol } = getRidCid(endCell);

    let values = [];
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            let cellValue = db[r][c]?.value;
            if (!isNaN(cellValue)) {
                values.push(Number(cellValue));
            }
        }
    }
    return values;
}

function SolveUI(value, rId, cId) {
    let tobeChangedCell = document.querySelector(`.grid .cell[rid='${rId}'][cid='${cId}']`);
    tobeChangedCell.textContent = value;
    db[rId][cId].value = value;

    let childrenA = db[rId][cId].children;
    for (let i = 0; i < childrenA.length; i++) {
        let chRidCid = getRidCid(childrenA[i]);
        let chCellObj = db[chRidCid.rId][chRidCid.cId];
        let value = evaluateFormula(chCellObj.formula);
        SolveUI(value, chRidCid.rId, chRidCid.cId);
    }
}

// To set a cell as a child of another cell (dependency tracking)
function setFormula(address, formula) {
    let formulaA = formula.split(" ");
    for (let i = 0; i < formulaA.length; i++) {
        let ASCI = formulaA[i].charCodeAt(0);
        if (ASCI >= 65 && ASCI <= 90) { // A1, B2, etc.
            let parentObj = getRidCid(formulaA[i]);
            let children = db[parentObj.rId][parentObj.cId].children;
            children.push(address);
        }
    }
}

// Remove a formula from a cell and update dependencies
function removeFormula(address, formula) {
    let formulaEntities = formula.split(" ");
    for (let i = 0; i < formulaEntities.length; i++) {
        let ascii = formulaEntities[i].charCodeAt(0);
        if (ascii >= 65 && ascii <= 90) {
            let parentrcObj = getRidCid(formulaEntities[i]);
            let children = db[parentrcObj.rId][parentrcObj.cId].children;
            let idx = children.indexOf(address);
            if (idx !== -1) children.splice(idx, 1);
        }
    }
}

