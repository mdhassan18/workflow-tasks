```javascript
const FILTERS = [
    "ORDER_TYPE",
    "account_type",
    "network_type",
    "service_type",
    "install_type",
    "technology_type",
    "product_type",
    "action_type"
];

let data = [];
let currentRows = [];

fetch("workflow_data_v2.json")
.then(response => response.json())
.then(json => {

    data = json;

    createFilters();

});

function createFilters(){

    const container =
    document.getElementById("filters");

    FILTERS.forEach((field,index)=>{

        const div =
        document.createElement("div");

        div.className =
        "filter-group";

        div.innerHTML = `
            <label>${formatLabel(field)}</label>
            <select id="${field}">
                <option value="">Select...</option>
            </select>
        `;

        container.appendChild(div);

    });

    populateDropdowns();

    FILTERS.forEach((field,index)=>{

        document
        .getElementById(field)
        .addEventListener("change",()=>{

            handleFilterChange(index);

        });

    });

    document
    .getElementById("taskSearch")
    .addEventListener("input",renderTasks);

}

function populateDropdowns(){

    FILTERS.forEach((field,index)=>{

        populateDropdown(field,index);

    });

}

function populateDropdown(field,index){

    let rows = data;

    for(let i=0;i<index;i++){

        const prevField =
        FILTERS[i];

        const value =
        document
        .getElementById(prevField)
        ?.value;

        if(value){

            rows =
            rows.filter(
                r=>r[prevField]===value
            );

        }

    }

    const values =
    [...new Set(
        rows
        .map(r=>r[field])
        .filter(Boolean)
    )]
    .sort();

    const select =
    document.getElementById(field);

    const current =
    select.value;

    select.innerHTML =
    `<option value="">Select...</option>`;

    values.forEach(v=>{

        select.innerHTML +=
        `<option value="${v}">
            ${v}
        </option>`;

    });

    if(values.includes(current))
        select.value=current;
}

function handleFilterChange(index){

    for(let i=index+1;i<FILTERS.length;i++){

        document
        .getElementById(FILTERS[i])
        .value="";

    }

    for(let i=index+1;i<FILTERS.length;i++){

        populateDropdown(
            FILTERS[i],
            i
        );

    }

    updateResults();

}

function updateResults(){

    currentRows =
    data.filter(row=>{

        return FILTERS.every(field=>{

            const value =
            document
            .getElementById(field)
            .value;

            if(!value)
                return true;

            return row[field]===value;

        });

    });

    if(currentRows.length===0){

        clearDashboard();

        return;
    }

    const population =
    currentRows[0].order_population;

    document.getElementById(
        "population"
    ).innerText =
    Number(population)
    .toLocaleString();

    document.getElementById(
        "mandatoryCount"
    ).innerText =
    currentRows.filter(
        r=>r.task_type==="MANDATORY"
    ).length;

    document.getElementById(
        "expectedCount"
    ).innerText =
    currentRows.filter(
        r=>r.task_type==="EXPECTED"
    ).length;

    document.getElementById(
        "optionalCount"
    ).innerText =
    currentRows.filter(
        r=>r.task_type==="OPTIONAL"
    ).length;

    buildWorkflowSummary();

    renderTasks();

}

function buildWorkflowSummary(){

    const html =
    FILTERS.map(field=>{

        const value =
        document
        .getElementById(field)
        .value;

        if(!value) return "";

        return `
            <b>${formatLabel(field)}:</b>
            ${value}
        `;

    }).join("<br>");

    document
    .getElementById("workflowSummary")
    .innerHTML = html;

}

function renderTasks(){

    const search =
    document
    .getElementById("taskSearch")
    .value
    .toLowerCase();

    const tbody =
    document
    .getElementById("taskTable");

    tbody.innerHTML="";

    currentRows
    .filter(r=>
        r.task_name
        .toLowerCase()
        .includes(search)
    )
    .sort((a,b)=>
        b.task_percentage -
        a.task_percentage
    )
    .forEach(row=>{

        let badge =
        "badge-optional";

        if(
            row.task_type==="MANDATORY"
        )
            badge=
            "badge-mandatory";

        if(
            row.task_type==="EXPECTED"
        )
            badge=
            "badge-expected";

        tbody.innerHTML += `
        <tr>

        <td>${row.task_name}</td>

        <td>

        <div class="progress-bar">

        <div
        class="progress-fill"
        style="width:${row.task_percentage}%">
        </div>

        </div>

        ${row.task_percentage}%

        </td>

        <td>

        <span class="badge ${badge}">
        ${row.task_type}
        </span>

        </td>

        </tr>
        `;

    });

}

function clearDashboard(){

    document
    .getElementById("population")
    .innerText="0";

    document
    .getElementById("mandatoryCount")
    .innerText="0";

    document
    .getElementById("expectedCount")
    .innerText="0";

    document
    .getElementById("optionalCount")
    .innerText="0";

    document
    .getElementById("workflowSummary")
    .innerHTML="";

    document
    .getElementById("taskTable")
    .innerHTML="";
}

function formatLabel(text){

    return text
    .replaceAll("_"," ")
    .replace(/\b\w/g,
        c=>c.toUpperCase()
    );

}
```
