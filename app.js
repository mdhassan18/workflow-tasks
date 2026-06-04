```javascript
let rawData=[];

const filters=[
"order_type",
"network_type",
"service_type",
"install_type",
"technology_type",
"product_type",
"action_type"
];

Papa.parse("./workflow_templates_master.csv",{
download:true,
header:true,
complete:function(results){

rawData=results.data.filter(r=>r.task_name);

initializeFilters();

}
});

function initializeFilters(){

populateFilter("order_type",rawData);

filters.forEach((f,index)=>{

document.getElementById(f)
.addEventListener("change",()=>{

updateCascade(index);

});

});

}

function populateFilter(id,data){

let select=document.getElementById(id);

let current=select.value;

let values=[...new Set(
data.map(x=>x[id]).filter(v=>v)
)].sort();

select.innerHTML="<option value=''>Select...</option>";

values.forEach(v=>{

let option=document.createElement("option");
option.value=v;
option.textContent=v;

select.appendChild(option);

});

if(values.includes(current))
select.value=current;

}

function updateCascade(changedIndex){

for(let i=changedIndex+1;i<filters.length;i++){

document.getElementById(filters[i]).value="";

}

let filtered=rawData;

for(let i=0;i<=changedIndex;i++){

let field=filters[i];
let value=document.getElementById(field).value;

if(value){

filtered=filtered.filter(
r=>r[field]===value
);

}

}

for(let i=changedIndex+1;i<filters.length;i++){

populateFilter(filters[i],filtered);

}

renderResults(getCurrentFilteredData());

}

function getCurrentFilteredData(){

let filtered=rawData;

filters.forEach(f=>{

let value=document.getElementById(f).value;

if(value){

filtered=filtered.filter(
r=>r[f]===value
);

}

});

return filtered;

}

function renderResults(rows){

let tbody=document.querySelector("#resultsTable tbody");

tbody.innerHTML="";

if(rows.length===0){

document.getElementById("population").innerText="0";
document.getElementById("mandatoryCount").innerText="0";
document.getElementById("expectedCount").innerText="0";
document.getElementById("optionalCount").innerText="0";

return;
}

document.getElementById("population").innerText=
Number(rows[0].order_population).toLocaleString();

document.getElementById("mandatoryCount").innerText=
rows.filter(x=>x.task_type==="MANDATORY").length;

document.getElementById("expectedCount").innerText=
rows.filter(x=>x.task_type==="EXPECTED").length;

document.getElementById("optionalCount").innerText=
rows.filter(x=>x.task_type==="OPTIONAL").length;

rows.sort((a,b)=>
parseFloat(b.task_percentage)-parseFloat(a.task_percentage)
);

rows.forEach(r=>{

let badgeClass="badge-optional";

if(r.task_type==="MANDATORY")
badgeClass="badge-mandatory";

if(r.task_type==="EXPECTED")
badgeClass="badge-expected";

tbody.innerHTML+=`

<tr>

<td>${r.task_name}</td>

<td>

<div style="display:flex;align-items:center;gap:10px;">

<div class="progress" style="width:180px;">
<div class="progress-fill"
style="width:${r.task_percentage}%">
</div>
</div>

<span>${r.task_percentage}%</span>

</div>

</td>

<td>
<span class="badge ${badgeClass}">
${r.task_type}
</span>
</td>

</tr>

`;

});

}
```
