const fields=['order_type','network_type','service_type','install_type','technology_type','product_type','action_type'];

let data=[];

fetch('workflow_data.json')
.then(r=>r.json())
.then(d=>{
    data=d;
    buildFilters();
});

function buildFilters(){

    const container=document.getElementById('filters');

    fields.forEach(field=>{

        const div=document.createElement('div');

        div.innerHTML=`
            <label>${field.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}</label>
            <select id="${field}">
                <option value="">Select...</option>
            </select>
        `;

        container.appendChild(div);

    });

    populateFromLevel(0);

    fields.forEach((field,index)=>{

        document
        .getElementById(field)
        .addEventListener('change',()=>{

            handleChange(index);

        });

    });

}

function populateFromLevel(level){

    for(let i=level;i<fields.length;i++){

        let filtered=data;

        for(let j=0;j<i;j++){

            const value=
            document.getElementById(fields[j]).value;

            if(value){

                filtered=
                filtered.filter(
                    r=>r[fields[j]]===value
                );

            }

        }

        const values=[
            ...new Set(
                filtered
                .map(r=>r[fields[i]])
                .filter(v=>v)
            )
        ].sort();

        const select=
        document.getElementById(fields[i]);

        select.innerHTML=
        `<option value="">Select...</option>`;

        values.forEach(v=>{

            select.innerHTML+=
            `<option value="${v}">${v}</option>`;

        });

    }

}

function handleChange(level){

    for(let i=level+1;i<fields.length;i++){

        document
        .getElementById(fields[i])
        .value='';

    }

    populateFromLevel(level+1);

    renderResults();

}

function renderResults(){

    let filtered=data;

    fields.forEach(field=>{

        const value=
        document.getElementById(field).value;

        if(value){

            filtered=
            filtered.filter(
                r=>r[field]===value
            );

        }

    });

    const tbody=
    document.getElementById('tbody');

    tbody.innerHTML='';

    if(filtered.length===0){

        document.getElementById('population').innerText='0';
        document.getElementById('mandatory').innerText='0';
        document.getElementById('expected').innerText='0';
        document.getElementById('optional').innerText='0';

        return;

    }

    document.getElementById('population').innerText=
    Number(filtered[0].order_population).toLocaleString();

    document.getElementById('mandatory').innerText=
    filtered.filter(x=>x.task_type==='MANDATORY').length;

    document.getElementById('expected').innerText=
    filtered.filter(x=>x.task_type==='EXPECTED').length;

    document.getElementById('optional').innerText=
    filtered.filter(x=>x.task_type==='OPTIONAL').length;

    filtered.sort(
        (a,b)=>
        parseFloat(b.task_percentage)
        -
        parseFloat(a.task_percentage)
    );

    filtered.forEach(row=>{

        tbody.innerHTML+=`

        <tr>

            <td>${row.task_name}</td>

            <td>

                <div style="display:flex;align-items:center;gap:10px;">

                    <div class="bar">

                        <div
                            class="fill"
                            style="width:${row.task_percentage}%">
                        </div>

                    </div>

                    ${row.task_percentage}%

                </div>

            </td>

            <td>

                <span class="badge ${row.task_type}">
                    ${row.task_type}
                </span>

            </td>

        </tr>

        `;

    });

}
