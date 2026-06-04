let data=[];

Papa.parse("workflow_templates_master.csv",{
    download:true,
    header:true,
    complete:function(results){

        data=results.data;

        populateFilters();
    }
});

const filters=[
"order_type",
"network_type",
"service_type",
"install_type",
"technology_type",
"product_type",
"action_type"
];

function populateFilters(){

    filters.forEach(col=>{

        let select=document.getElementById(col);

        let values=[...new Set(
            data.map(r=>r[col]).filter(v=>v)
        )];

        select.innerHTML="<option value=''>All</option>";

        values.sort().forEach(v=>{

            let option=document.createElement("option");
            option.value=v;
            option.textContent=v;

            select.appendChild(option);

        });

    });

}

document.getElementById("runBtn")
.addEventListener("click",runAnalysis);

function runAnalysis(){

    let filtered=data.filter(row=>{

        return filters.every(f=>{

            let value=document.getElementById(f).value;

            return !value || row[f]===value;

        });

    });

    renderResults(filtered);

}

function renderResults(rows){

    const tbody=document.querySelector("#resultsTable tbody");

    tbody.innerHTML="";

    if(rows.length===0){

        tbody.innerHTML=
        "<tr><td colspan='5'>No Matching Workflow</td></tr>";

        return;
    }

    let population=rows[0].order_population;

    document.getElementById("population").innerText=
    Number(population).toLocaleString();

    document.getElementById("mandatoryCount").innerText=
    rows.filter(r=>r.task_type==="MANDATORY").length;

    document.getElementById("expectedCount").innerText=
    rows.filter(r=>r.task_type==="EXPECTED").length;

    document.getElementById("optionalCount").innerText=
    rows.filter(r=>r.task_type==="OPTIONAL").length;

    rows.sort((a,b)=>
        parseFloat(b.task_percentage) -
        parseFloat(a.task_percentage)
    );

    rows.forEach(r=>{

        let badge="optional-badge";

        if(r.task_type==="MANDATORY")
            badge="mandatory-badge";

        if(r.task_type==="EXPECTED")
            badge="expected-badge";

        tbody.innerHTML+=`
        <tr>

            <td>${r.task_name}</td>

            <td>${Number(r.orders_with_task).toLocaleString()}</td>

            <td>${Number(r.order_population).toLocaleString()}</td>

            <td>${r.task_percentage}%</td>

            <td>
                <span class="${badge}">
                    ${r.task_type}
                </span>
            </td>

        </tr>
        `;
    });

}
