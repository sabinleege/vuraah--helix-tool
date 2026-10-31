import './globals.css';
import SWRegister from './sw-register';
export const metadata={title:'Helix — Genomic Intelligence',description:'Genomic reasoning platform'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<SWRegister/></body></html>}
