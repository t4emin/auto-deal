import Link from "next/link";
import { appConfig } from "./config";

export default function Home() {
  return <main className="service-page"><div className="service-card">
    <span className="eyebrow">{appConfig.description.toUpperCase()}</span>
    <h1>{appConfig.name}</h1>
    <p>CMS สำหรับจัดการสต๊อกรถ, รูปภาพ, คุณสมบัติแบบยืดหยุ่น และ public API สำหรับเว็บหน้าร้าน</p>
    <div className="service-actions"><Link className="primary" href="/admin">เปิด Admin console</Link><a className="secondary" href="/api/v1/health">API health</a></div>
    <div className="endpoint"><i /> GET /api/v1/vehicles</div>
  </div></main>;
}
