/* eslint-disable @next/next/no-img-element -- admin previews include private R2 URLs */
"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Braces,
  Car,
  Check,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  UploadCloud,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CmsUser } from "../auth";
import { appConfig } from "../config";

type Vehicle={
  id:string;slug:string;title:string;make:string;model:string;variant:string;year:number;
  price:number;mileage:number;condition:string;bodyType:string;transmission:string;fuelType:string;
  exteriorColor:string;interiorColor:string;shortDescription:string;description:string;
  dealerName:string;contactUrl:string;images:string[];attributes:Record<string,unknown>;
  status:"draft"|"available"|"reserved"|"sold"|"hidden";updatedAt?:string;
};
type Def={id:string;code:string;label:string;value_type:string;allow_multiple:number;unit?:string};
type Opt={id:string;attribute_id:string;value:string;label:string};
type MapRow={category:string;attribute_id:string;required:number;sort_order:number};
type AuditRow={id:string;actor:string;action:string;target_type:string;target_id:string;summary:string;created_at:string};
type UserRow={id:string;username:string;status:string;created_at:string;approved_at:string|null;last_login_at:string|null};

const bodyTypes=[
  ["sedan","Sedan"],["hatchback","Hatchback"],["suv","SUV"],["pickup","Pickup"],["coupe","Coupe"],
  ["convertible","Convertible"],["van","Van"],["wagon","Wagon"],["mpv","MPV"],["other","Other"]
].map(([value,label])=>({value,label}));
const statusOptions=[
  {value:"draft",label:"Draft"},{value:"available",label:"Available"},{value:"reserved",label:"Reserved"},
  {value:"sold",label:"Sold"},{value:"hidden",label:"Hidden"}
];
const statusLabels=Object.fromEntries(statusOptions.map(option=>[option.value,option.label]));
const moneyFormatter=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const blank:Vehicle={
  id:"",slug:"",title:"",make:"",model:"",variant:"",year:new Date().getFullYear(),
  price:0,mileage:0,condition:"used",bodyType:"sedan",transmission:"automatic",fuelType:"petrol",
  exteriorColor:"",interiorColor:"",shortDescription:"",description:"",dealerName:"",contactUrl:"",
  images:[],attributes:{},status:"draft"
};

async function cmsFetch(input:RequestInfo|URL,init?:RequestInit){
  const response=await fetch(input,init);
  if(response.status===401){
    window.location.assign("/login");
    throw new Error("Session expired");
  }
  return response;
}

function useBodyScrollLock(){
  useEffect(()=>{
    const body=document.body,scrollY=window.scrollY;
    const previous={overflow:body.style.overflow,position:body.style.position,top:body.style.top,width:body.style.width};
    body.style.overflow="hidden";body.style.position="fixed";body.style.top=`-${scrollY}px`;body.style.width="100%";
    return()=>{body.style.overflow=previous.overflow;body.style.position=previous.position;body.style.top=previous.top;body.style.width=previous.width;window.scrollTo(0,scrollY)};
  },[]);
}

export default function AdminConsole({currentUser}:{currentUser:CmsUser}){
  const [tab,setTab]=useState("dashboard");
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [defs,setDefs]=useState<Def[]>([]);
  const [opts,setOpts]=useState<Opt[]>([]);
  const [maps,setMaps]=useState<MapRow[]>([]);
  const [audits,setAudits]=useState<AuditRow[]>([]);
  const [editing,setEditing]=useState<Vehicle|null>(null);
  const [query,setQuery]=useState("");
  const [status,setStatus]=useState("");
  const [bodyType,setBodyType]=useState("");

  const load=useCallback(async()=>{
    const [vehicleJson,attributeJson,auditJson]=await Promise.all([
      cmsFetch("/api/admin/vehicles").then(x=>x.json()),
      cmsFetch("/api/admin/attributes").then(x=>x.json()),
      cmsFetch("/api/admin/audit").then(x=>x.json())
    ]);
    setVehicles(vehicleJson.data||[]);
    setDefs(attributeJson.data?.definitions||[]);
    setOpts(attributeJson.data?.options||[]);
    setMaps(attributeJson.data?.categoryAttributes||[]);
    setAudits(auditJson.data||[]);
  },[]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);

  async function save(vehicle:Vehicle){
    const response=await cmsFetch(vehicle.id?`/api/admin/vehicles/${vehicle.id}`:"/api/admin/vehicles",{
      method:vehicle.id?"PATCH":"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(vehicle)
    });
    const body=await response.json();
    if(!response.ok)throw Error(body.error||body.errors?.join(", ")||"Unable to save vehicle");
    setEditing(null);await load();
  }

  const filtered=vehicles.filter(vehicle=>{
    const haystack=`${vehicle.title} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`.toLowerCase();
    return (!query||haystack.includes(query.toLowerCase()))&&(!status||vehicle.status===status)&&(!bodyType||vehicle.bodyType===bodyType);
  });
  const counts=statusOptions.reduce<Record<string,number>>((acc,item)=>({...acc,[item.value]:vehicles.filter(v=>v.status===item.value).length}),{});
  const navigation:{key:string;label:string;icon:LucideIcon}[]=[
    {key:"dashboard",label:"Dashboard",icon:LayoutDashboard},
    {key:"vehicles",label:"Vehicles",icon:Car},
    {key:"attributes",label:"Attributes",icon:SlidersHorizontal},
    ...(currentUser.isOwner?[{key:"users",label:"Users",icon:Users}]:[]),
    {key:"audit",label:"Audit Log",icon:History},
    {key:"api",label:"Public API",icon:Braces}
  ];
  const title:Record<string,string>={dashboard:"Dashboard",vehicles:"Vehicles",attributes:"Attributes",users:"Users",audit:"Audit Log",api:"Public API"};

  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="brandmark"><b><Car size={18} strokeWidth={2.3}/></b><div>{appConfig.name}<small>{appConfig.description}</small></div></div>
      <nav>{navigation.map(({key,label,icon:Icon})=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}><span><Icon size={17}/></span>{label}</button>)}</nav>
      <div className="sidebar-account"><span>{currentUser.username.slice(0,1).toUpperCase()}</span>
        <div><b>{currentUser.username}</b><small>{currentUser.isOwner?"Owner":"Approved"}</small></div>
        <button className="logout-button" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.assign("/login")}}><LogOut size={15}/>ออกจากระบบ</button>
      </div>
    </aside>
    <main className="workspace">
      <header><div><span className="eyebrow">ADMIN CONSOLE</span><h1>{title[tab]}</h1></div>
        {tab==="vehicles"&&<button className="primary icon-button" onClick={()=>setEditing({...blank})}><Plus size={17}/>Add Vehicle</button>}
      </header>
      {tab==="dashboard"&&<Dashboard vehicles={vehicles} counts={counts}/>}
      {tab==="vehicles"&&<section>
        <div className="toolbar vehicle-toolbar">
          <label className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, make, model..."/></label>
          <CustomSelect value={status} options={statusOptions} placeholder="All statuses" onChange={value=>setStatus(String(value))}/>
          <CustomSelect value={bodyType} options={bodyTypes} placeholder="All body types" onChange={value=>setBodyType(String(value))}/>
          <span>{filtered.length} vehicles</span>
        </div>
        <VehicleTable vehicles={filtered} edit={setEditing} reload={load}/>
      </section>}
      {tab==="attributes"&&<AttributeManager defs={defs} opts={opts} maps={maps} reload={load}/>}
      {tab==="users"&&currentUser.isOwner&&<UserManager currentUser={currentUser}/>}
      {tab==="audit"&&<AuditLog rows={audits}/>}
      {tab==="api"&&<ApiDocs/>}
    </main>
    {editing&&<VehicleEditor vehicle={editing} defs={defs} opts={opts} maps={maps} close={()=>setEditing(null)} save={save}/>}
  </div>;
}

function Dashboard({vehicles,counts}:{vehicles:Vehicle[];counts:Record<string,number>}){
  return <section><div className="metric-grid">
    {[
      ["Total Vehicles",vehicles.length],["Available",counts.available||0],["Reserved",counts.reserved||0],
      ["Sold",counts.sold||0],["Draft",counts.draft||0]
    ].map(([label,value])=><article className="metric-card" key={label}><span>{label}</span><b>{value}</b></article>)}
  </div>
  <div className="section-bar"><h2>Recently Updated</h2><p>{vehicles.slice(0,5).length} latest records</p></div>
  <VehicleTable vehicles={vehicles.slice(0,5)} edit={()=>undefined} reload={async()=>undefined} compact/>
  </section>;
}

function VehicleTable({vehicles,edit,reload,compact=false}:{vehicles:Vehicle[];edit:(vehicle:Vehicle)=>void;reload:()=>Promise<void>;compact?:boolean}){
  return <div className="table vehicle-table"><div className="tr table-head">
    <span>Image</span><span>Title</span><span>Make / Model</span><span>Year</span><span>Mileage</span><span>Price</span><span>Status</span>{!compact&&<span/>}
  </div>{vehicles.map(vehicle=><div className="tr" key={vehicle.id}>
    <span className="vehicle-thumb">{vehicle.images[0]?<img src={vehicle.images[0]} alt=""/>:<em>{vehicle.make.slice(0,2).toUpperCase()}</em>}</span>
    <span><b>{vehicle.title}</b><small>{vehicle.bodyType}</small></span>
    <span>{vehicle.make} {vehicle.model}<small>{vehicle.variant}</small></span>
    <span>{vehicle.year}</span><span>{Number(vehicle.mileage).toLocaleString()} km</span>
    <span>฿{moneyFormatter.format(Number(vehicle.price)||0)}</span>
    <span><label className={`status ${vehicle.status}`}>{statusLabels[vehicle.status]||vehicle.status}</label></span>
    {!compact&&<span className="row-actions"><button title="Edit" aria-label="Edit vehicle" onClick={()=>edit({...vehicle})}><Pencil size={14}/>Edit</button>
      <button title="Delete" aria-label="Delete vehicle" onClick={async()=>{if(confirm("Delete this vehicle?")){await cmsFetch(`/api/admin/vehicles/${vehicle.id}`,{method:"DELETE"});await reload()}}}><Trash2 size={14}/>Delete</button></span>}
  </div>)}</div>;
}

function VehicleEditor({vehicle:initial,defs,opts,maps,close,save}:{vehicle:Vehicle;defs:Def[];opts:Opt[];maps:MapRow[];close:()=>void;save:(vehicle:Vehicle)=>Promise<void>}){
  useBodyScrollLock();
  const [vehicle,setVehicle]=useState(initial);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const active=useMemo(()=>maps.filter(m=>m.category===vehicle.bodyType).sort((a,b)=>a.sort_order-b.sort_order)
    .map(map=>({map,def:defs.find(d=>d.id===map.attribute_id)})).filter((item):item is {map:MapRow;def:Def}=>Boolean(item.def)),[vehicle.bodyType,defs,maps]);
  const set=(key:keyof Vehicle,value:unknown)=>setVehicle(old=>({...old,[key]:value}));
  const setAttribute=(code:string,value:unknown)=>setVehicle(old=>({...old,attributes:{...old.attributes,[code]:value}}));
  async function upload(files:FileList){
    setBusy(true);
    try{for(const file of Array.from(files)){
      const data=new FormData();data.append("file",file);
      const response=await cmsFetch("/api/admin/uploads",{method:"POST",body:data});
      const body=await response.json();if(!response.ok)throw Error(body.error||"Upload failed");
      setVehicle(old=>({...old,images:[...old.images,body.data.url]}));
    }}catch(reason){setError(reason instanceof Error?reason.message:"Upload failed")}finally{setBusy(false)}
  }
  function validate(){
    if(!vehicle.title.trim()||!vehicle.make.trim()||!vehicle.model.trim()){setError("Title, make and model are required");return false}
    if(Number(vehicle.year)<1886){setError("Year must be valid");return false}
    setError("");return true;
  }
  return <div className="scrim"><div className="drawer">
    <div className="drawer-head"><div><span className="eyebrow">{vehicle.id?"EDIT VEHICLE":"NEW VEHICLE"}</span><h2>{vehicle.title||"Add Vehicle"}</h2></div><button className="close" aria-label="Close editor" onClick={close}><X size={21}/></button></div>
    <div className="form-body">
      <h3>Basic Information</h3><div className="grid">
        <Field label="Title" required><input value={vehicle.title} onChange={e=>set("title",e.target.value)}/></Field>
        <Field label="Status"><CustomSelect value={vehicle.status} options={statusOptions} onChange={value=>set("status",value)}/></Field>
        <Field label="Make" required><input value={vehicle.make} onChange={e=>set("make",e.target.value)}/></Field>
        <Field label="Model" required><input value={vehicle.model} onChange={e=>set("model",e.target.value)}/></Field>
        <Field label="Variant"><input value={vehicle.variant} onChange={e=>set("variant",e.target.value)}/></Field>
        <Field label="Year"><input type="number" value={vehicle.year} onChange={e=>set("year",+e.target.value)}/></Field>
        <Field label="Body Type"><CustomSelect value={vehicle.bodyType} options={bodyTypes} onChange={value=>set("bodyType",value)}/></Field>
        <Field label="Condition"><input value={vehicle.condition} onChange={e=>set("condition",e.target.value)}/></Field>
      </div>
      <h3>Pricing</h3><div className="grid"><Field label="Price"><input type="number" step="0.01" value={vehicle.price} onChange={e=>set("price",+e.target.value)}/></Field></div>
      <h3>Vehicle Details</h3><div className="grid">
        <Field label="Mileage"><input type="number" value={vehicle.mileage} onChange={e=>set("mileage",+e.target.value)}/></Field>
        <Field label="Transmission"><input value={vehicle.transmission} onChange={e=>set("transmission",e.target.value)}/></Field>
        <Field label="Fuel Type"><input value={vehicle.fuelType} onChange={e=>set("fuelType",e.target.value)}/></Field>
        <Field label="Exterior Color"><input value={vehicle.exteriorColor} onChange={e=>set("exteriorColor",e.target.value)}/></Field>
        <Field label="Interior Color"><input value={vehicle.interiorColor} onChange={e=>set("interiorColor",e.target.value)}/></Field>
      </div>
      <h3>Description</h3><div className="grid">
        <Field wide label="Short Description"><input value={vehicle.shortDescription} onChange={e=>set("shortDescription",e.target.value)}/></Field>
        <Field wide label="Description"><textarea rows={5} value={vehicle.description} onChange={e=>set("description",e.target.value)}/></Field>
      </div>
      <h3>Dealer</h3><div className="grid">
        <Field label="Dealer Name"><input value={vehicle.dealerName} onChange={e=>set("dealerName",e.target.value)}/></Field>
        <Field label="Contact URL"><input value={vehicle.contactUrl} onChange={e=>set("contactUrl",e.target.value)} placeholder="https://example.com/contact"/></Field>
      </div>
      <h3>Images</h3><div className="dropzone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files)}}>
        <input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={e=>e.target.files&&void upload(e.target.files)}/>
        <UploadCloud size={24}/><b>{busy?"Uploading...":"Drop images here or click to select"}</b><small>JPG, PNG, WebP up to 8 MB</small>
      </div><div className="image-list">{vehicle.images.map((src,index)=><div key={`${src}-${index}`} className={index===0?"cover":""}>
        <img src={src} alt=""/><small>{index===0?"Cover":`#${index+1}`}</small>
        <div className="image-actions"><button type="button" title="Set cover" onClick={()=>set("images",[src,...vehicle.images.filter((_,i)=>i!==index)])}><Star size={12}/>Cover</button>
          <button type="button" title="Remove image" aria-label="Remove image" onClick={()=>set("images",vehicle.images.filter((_,i)=>i!==index))}><X size={12}/></button></div>
      </div>)}</div>
      <h3>Additional Specifications</h3><div className="grid">
        {active.map(({def})=><Field key={def.id} label={def.label+(def.unit?` (${def.unit})`:"")}>
          <AttributeInput def={def} options={opts.filter(o=>o.attribute_id===def.id)} value={vehicle.attributes[def.code]} change={value=>setAttribute(def.code,value)}/>
        </Field>)}
      </div>
      {error&&<div className="form-errors"><span>{error}</span></div>}
    </div>
    <div className="drawer-foot"><button className="secondary icon-button" onClick={close}><X size={16}/>Cancel</button><button className="primary icon-button" disabled={busy} onClick={async()=>{if(!validate())return;setBusy(true);try{await save(vehicle)}catch(reason){setError(reason instanceof Error?reason.message:"Unable to save")}finally{setBusy(false)}}}><Save size={16}/>Save Vehicle</button></div>
  </div></div>;
}

function AttributeInput({def,options,value,change}:{def:Def;options:Opt[];value:unknown;change:(value:unknown)=>void}){
  if(def.value_type==="select")return <CustomSelect multiple={!!def.allow_multiple}
    value={def.allow_multiple?(Array.isArray(value)?value.map(String):[]):String(value??"")}
    options={options.map(option=>({value:option.value,label:option.label}))}
    placeholder="Select" onChange={change}/>;
  if(def.value_type==="boolean")return <CustomSelect value={String(value??"")}
    options={[{value:"true",label:"Yes"},{value:"false",label:"No"}]}
    placeholder="Select" onChange={selected=>change(String(selected)==="true")}/>;
  return <input type={def.value_type==="number"?"number":"text"} value={String(value??"")} onChange={e=>change(def.value_type==="number"?+e.target.value:e.target.value)}/>;
}

function CustomSelect({value,options,onChange,multiple=false,placeholder="Select"}:{
  value:string|string[];
  options:{value:string;label:string}[];
  onChange:(value:string|string[])=>void;
  multiple?:boolean;
  placeholder?:string;
}){
  const [open,setOpen]=useState(false);
  const rootRef=useRef<HTMLDivElement>(null);
  const menuRef=useRef<HTMLDivElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const listboxId=useId();
  const selected:string[]=multiple
    ? (Array.isArray(value)?value:[])
    : [Array.isArray(value)?"":value];
  const selectedLabels=options.filter(option=>selected.includes(option.value)).map(option=>option.label);

  useEffect(()=>{
    function dismiss(event:PointerEvent){
      if(!rootRef.current?.contains(event.target as Node))setOpen(false);
    }
    function escape(event:KeyboardEvent){
      if(event.key==="Escape")setOpen(false);
    }
    document.addEventListener("pointerdown",dismiss);
    document.addEventListener("keydown",escape);
    return()=>{
      document.removeEventListener("pointerdown",dismiss);
      document.removeEventListener("keydown",escape);
    };
  },[]);

  function focusOption(index:number){
    const items=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button")||[]);
    items[(index+items.length)%items.length]?.focus();
  }
  function toggle(next:string){
    if(multiple){
      onChange(selected.includes(next)?selected.filter(item=>item!==next):[...selected,next]);
      return;
    }
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const summary=selectedLabels.length
    ? multiple
      ? selectedLabels.slice(0,2).join(", ")+(selectedLabels.length>2?` +${selectedLabels.length-2}`:"")
      : selectedLabels[0]
    : placeholder;

  return <div className={`custom-select${open?" open":""}`} ref={rootRef}>
    <button ref={triggerRef} type="button" className="custom-select-trigger"
      aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId}
      onClick={()=>setOpen(current=>!current)}
      onKeyDown={event=>{
        if(event.key==="ArrowDown"){
          event.preventDefault();setOpen(true);
          requestAnimationFrame(()=>focusOption(Math.max(0,options.findIndex(option=>selected.includes(option.value)))));
        }
      }}>
      <span className={selectedLabels.length?"":"placeholder"}>{summary}</span>
      {multiple&&selectedLabels.length>0&&<small>{selectedLabels.length}</small>}
      <ChevronDown aria-hidden="true" size={16}/>
    </button>
    {open&&<div ref={menuRef} id={listboxId} className="custom-select-menu" role="listbox" aria-multiselectable={multiple||undefined}>
      {options.length===0&&<button type="button" className="empty-option" disabled>No options</button>}
      {options.map((option,index)=>{
        const active=selected.includes(option.value);
        return <button key={option.value} type="button" role="option" aria-selected={active} className={active?"selected":""}
          onClick={()=>toggle(option.value)}
          onKeyDown={event=>{
            if(event.key==="ArrowDown"||event.key==="ArrowUp"){
              event.preventDefault();focusOption(index+(event.key==="ArrowDown"?1:-1));
            }
            if(event.key==="Enter"||event.key===" "){
              event.preventDefault();toggle(option.value);
            }
          }}>
          <span>{option.label}</span>{active&&<Check aria-hidden="true" size={15}/>}
        </button>;
      })}
    </div>}
  </div>;
}

function AttributeManager({defs,opts,maps,reload}:{defs:Def[];opts:Opt[];maps:MapRow[];reload:()=>Promise<void>}){
  const [label,setLabel]=useState(""),[code,setCode]=useState(""),[valueType,setValueType]=useState("text"),[unit,setUnit]=useState("");
  async function create(){
    const response=await cmsFetch("/api/admin/attributes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label,code,valueType,unit,categories:bodyTypes.map(x=>x.value)})});
    if(response.ok){setLabel("");setCode("");setUnit("");await reload()}else alert((await response.json()).error||"Unable to create attribute");
  }
  return <section><div className="attribute-create">
    <input placeholder="Label" value={label} onChange={e=>setLabel(e.target.value)}/>
    <input placeholder="code" value={code} onChange={e=>setCode(e.target.value)}/>
    <CustomSelect value={valueType} options={[{value:"text",label:"Text"},{value:"number",label:"Number"},{value:"select",label:"Select"},{value:"boolean",label:"Boolean"}]} onChange={value=>setValueType(String(value))}/>
    <input placeholder="Unit" value={unit} onChange={e=>setUnit(e.target.value)}/>
    <button className="primary icon-button" onClick={create}><Plus size={16}/>Add Attribute</button>
  </div><div className="card-grid">{defs.map(def=><article className="attribute-card" key={def.id}>
    <div className="attribute-card-head"><span className="type">{def.value_type}</span><code>{def.code}</code></div>
    <h3>{def.label}</h3><p>{maps.filter(m=>m.attribute_id===def.id).map(m=>m.category).join(" · ")}</p>
    <div className="chips">{opts.filter(o=>o.attribute_id===def.id).map(option=><span key={option.id}>{option.label}</span>)}</div>
  </article>)}</div></section>;
}

function UserManager({currentUser}:{currentUser:CmsUser}){
  const [users,setUsers]=useState<UserRow[]>([]);
  const load=useCallback(async()=>{const body=await cmsFetch("/api/admin/users").then(x=>x.json());setUsers(body.data||[])},[]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load]);
  async function approve(id:string){await cmsFetch(`/api/admin/users/${id}`,{method:"PATCH"});await load()}
  async function remove(id:string){if(confirm("Delete this user?")){await cmsFetch(`/api/admin/users/${id}`,{method:"DELETE"});await load()}}
  return <section><div className="table users-table">{users.map(user=><div className="tr" key={user.id}>
    <span><b>{user.username}</b><small>{user.status}</small></span><span>{user.approved_at?"Approved":"Pending"}</span>
    <span>{user.last_login_at?new Date(user.last_login_at).toLocaleDateString():"Never"}</span>
    <span className="row-actions">{user.status!=="active"&&<button onClick={()=>approve(user.id)}><BadgeCheck size={14}/>Approve</button>}{user.username!==currentUser.username&&<button onClick={()=>remove(user.id)}><Trash2 size={14}/>Delete</button>}</span>
  </div>)}</div></section>;
}

function AuditLog({rows}:{rows:AuditRow[]}){
  return <section className="audit-list">{rows.map(row=><article key={row.id}><span>{row.action}</span><div><b>{row.target_type}:{row.target_id}</b><p>{row.summary} · {row.actor} · {new Date(row.created_at).toLocaleString()}</p></div></article>)}</section>;
}

function ApiDocs(){
  return <section className="api-docs"><p>Public endpoints return only available, reserved and sold vehicles.</p>
    {["GET /api/v1/vehicles?make=Toyota&bodyType=coupe&minPrice=500000","GET /api/v1/vehicles/:slug","GET /api/v1/schema","GET /api/v1/images/:key"].map(endpoint=><div key={endpoint}><code>{endpoint}</code></div>)}
  </section>;
}

function Field({label,children,wide=false,required=false}:{label:string;children:React.ReactNode;wide?:boolean;required?:boolean}){
  return <label className={`field${wide?" wide":""}`}><span>{label}{required&&<b>*</b>}</span>{children}</label>;
}
