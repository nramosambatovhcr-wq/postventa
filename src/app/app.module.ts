import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AddTutorialComponent } from './components/add-tutorial/add-tutorial.component';
import { TutorialDetailsComponent } from './components/tutorial-details/tutorial-details.component';
import { TutorialsListComponent } from './components/tutorials-list/tutorials-list.component';

import { ListaproveedorComponent } from './proveedor/listaproveedor/listaproveedor.component';
import { ListaproductoComponent } from './productos/listaproducto/listaproducto.component';
import { ListapedidoComponent } from './pedidous/pedidos/listapedido/listapedido.component';
 
import { AddPedidoComponent } from './pedidous/pedidos/add-pedido/add-pedido.component';
import { AddProductoComponent } from './productos/add-producto/add-producto.component';
import { AddProveedorComponent } from './proveedor/add-proveedor/add-proveedor.component';
import { ProductoDetailsComponent } from './productos/producto-details/producto-details.component';
import { PedidoDetailsComponent } from './pedidous/pedidos/pedido-details/pedido-details.component';
import { ProveedorDetailsComponent } from './proveedor/proveedor-details/proveedor-details.component';
import { ListacategoriaComponent } from './categorias/listacategoria/listacategoria.component';
import { AddCategoriaComponent } from './categorias/add-categoria/add-categoria.component';
import { CategoriaDetailsComponent } from './categorias/categoria-details/categoria-details.component';
import { ListaimportacionesComponent } from './importaciones/listaimportaciones/listaimportaciones.component';
import { AddImportacionComponent } from './importaciones/add-importacion/add-importacion.component';
import { ImportacionDetailsComponent } from './importaciones/importacion-details/importacion-details.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ImportDetailComponent } from './import-detail/import-detail.component';
import { LoginComponent } from './login/login.component';
import { DocumentoUploadComponent } from './documento-upload/documento-upload.component';
import { NavigationComponent } from './navigation/navigation.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ImportEditComponent } from './import-edit/import-edit.component';
import { FechasOrdenEditComponent } from './fechas-orden-edit/fechas-orden-edit.component';
import { LiquidadoComponent } from './liquidado/liquidado.component';
import { ProcesoComponent } from './proceso/proceso.component';
import { DetalleordenComponent } from './detalleorden/detalleorden.component';
import { PedidobodComponent } from './pedidovhcr/pedidobod/pedidobod.component';
import { ModalImageComponent } from './modal-image/modal-image.component';
import { PedidobodrevComponent } from './pedidovhcr/pedidobodrev/pedidobodrev.component';
import { PedidoboderrorComponent } from './pedidovhcr/pedidoboderror/pedidoboderror.component';
import { AuthInterceptor } from './services/auth.interceptor';
import { AccessDeniedComponent } from './access-denied/access-denied.component';
import { LaboratorioComponent } from './laboratorio/laboratorio.component';
import { LaboratoriorevComponent } from './laboratoriorev/laboratoriorev.component';
import { LaboratoriovehisComponent } from './laboratoriovehis/laboratoriovehis.component';
import { AppInitializerService } from './services/app-initializer.service';
import { PedidosbodComponent } from './pedidous/pedidosbod/pedidosbod.component';
import { PedidosbodrevComponent } from './pedidous/pedidosbodrev/pedidosbodrev.component';
import { PedidosboderrorComponent } from './pedidous/pedidosboderror/pedidosboderror.component';
import { PedidoIndividualComponent } from './pedidovhcr/pedido-individual/pedido-individual.component';
import { PedidoExcelComponent } from './pedidovhcr/pedido-excel/pedido-excel.component';
import { SugeridosComponent } from './sugeridos/sugeridos.component';
import { SugeridosrevComponent } from './sugeridosrev/sugeridosrev.component';
import { SugeridoserrorComponent } from './sugeridoserror/sugeridoserror.component';
import { CrearsugeridoComponent } from './crearsugerido/crearsugerido.component';
import { SugeridoexcelComponent } from './sugeridoexcel/sugeridoexcel.component';
import { SugeridosadComponent } from './sugeridosad/sugeridosad.component';
import { SugeridosadrevComponent } from './sugeridosadrev/sugeridosadrev.component';
import { SugeridosaderrorComponent } from './sugeridosaderror/sugeridosaderror.component';
import { CrearComponent } from './cotizacion/crear/crear.component';
import { DetalleComponent } from './cotizacion/detalle/detalle.component';
import { ExceldetalleComponent } from './cotizacion/exceldetalle/exceldetalle.component';
import { DashboardcotComponent } from './cotizacion/dashboardcot/dashboardcot.component';
import { InvoicecrearComponent } from './invoice/invoicecrear/invoicecrear.component';
import { InvoicedetalleComponent } from './invoice/invoicedetalle/invoicedetalle.component';
import { InvoicexcelComponent } from './invoice/invoicexcel/invoicexcel.component';
import { DashboardinvoiComponent } from './invoice/dashboardinvoi/dashboardinvoi.component';
import { LaboratoriovehidetailComponent } from './laboratoriovehidetail/laboratoriovehidetail.component';
import { AprobadasComponent } from './cotizacion/aprobadas/aprobadas.component';
import { RechazadasComponent } from './cotizacion/rechazadas/rechazadas.component';
import { DetallescotComponent } from './cotizacion/detallescot/detallescot.component';
import { DashboardcotproComponent } from './cotizacionprov/dashboardcotpro/dashboardcotpro.component';
import { RespuestaproComponent } from './cotizacionprov/respuestapro/respuestapro.component';
import { ObservacionesComponent } from './observaciones/observaciones.component';
import { RevisioncotComponent } from './cotizacion/revisioncot/revisioncot.component';
import { CommonModule } from '@angular/common';
import { CreateInvoiceComponent } from './invoice/create-invoice/create-invoice.component';
import { DashboardinvoiceComponent } from './invoice/dashboardinvoice/dashboardinvoice.component';
import { ObservacionespedComponent } from './observacionesped/observacionesped.component';
import { DashboardbodimpComponent } from './bodegaimport/dashboardbodimp/dashboardbodimp.component';
import { PedidobodproComponent } from './pedidovhcr/pedidobodpro/pedidobodpro.component';
import { PedidobodasigComponent } from './pedidovhcr/pedidobodasig/pedidobodasig.component';
import { BodegaimporenvComponent } from './bodegaimport/bodegaimporenv/bodegaimporenv.component';
import { DashboardlabComponent } from './laboratorioar/dashboardlab/dashboardlab.component';
import { SugelabcrearComponent } from './laboratorioar/sugelabcrear/sugelabcrear.component';
import { SugelabexcelComponent } from './laboratorioar/sugelabexcel/sugelabexcel.component';
import { PedidosbodasigComponent } from './pedidous/pedidosbodasig/pedidosbodasig.component';
import { PedidosbodproceComponent } from './pedidous/pedidosbodproce/pedidosbodproce.component';
import { SugeridoslabrevComponent } from './laboratorioar/sugeridoslabrev/sugeridoslabrev.component';
import { DashboardblComponent } from './bl/dashboardbl/dashboardbl.component';
import { BlCreateComponent } from './bl/bl-create/bl-create.component';
import { BlInvoiceComponent } from './bl/bl-invoice/bl-invoice.component';
import { BlInvoiceexcelComponent } from './bl/bl-invoiceexcel/bl-invoiceexcel.component';
import { BlInvoicebldetailComponent } from './bl/bl-invoicebldetail/bl-invoicebldetail.component';
import { OilListComponent } from './pedidovhcr/oil/oil-list/oil-list.component';
import { OilCreateComponent } from './pedidovhcr/oil/oil-create/oil-create.component';
import { OilEditComponent } from './pedidovhcr/oil/oil-edit/oil-edit.component';
import { OilPedidosComponent } from './pedidovhcr/oil/oil-pedidos/oil-pedidos.component';
import { OiluslistComponent } from './pedidous/oil/oiluslist/oiluslist.component';
import { OiluspedComponent } from './pedidous/oil/oilusped/oilusped.component';
import { FilterCreateComponent } from './pedidovhcr/oil/filter-create/filter-create.component';
import { InsumoCreateComponent } from './pedidovhcr/oil/insumo-create/insumo-create.component';
import { FilteruspedComponent } from './pedidous/filter/filterusped/filterusped.component';
import { FilteruslistComponent } from './pedidous/filter/filteruslist/filteruslist.component';
import { InsumouslistComponent } from './pedidous/insumos/insumouslist/insumouslist.component';
import { InsumouspedComponent } from './pedidous/insumos/insumousped/insumousped.component';
import { FilterListComponent } from './pedidovhcr/oil/filter-list/filter-list.component';
import { InsumoListComponent } from './pedidovhcr/oil/insumo-list/insumo-list.component';
import { DashboardprovpedComponent } from './proveedoroil/dashboardprovped/dashboardprovped.component';
import { OilListenvComponent } from './pedidovhcr/oil/oil-listenv/oil-listenv.component';
import { FilterListenvComponent } from './pedidovhcr/oil/filter-listenv/filter-listenv.component';
import { InsumoListenvComponent } from './pedidovhcr/oil/insumo-listenv/insumo-listenv.component';
import { ObservacionesoilComponent } from './observacionesoil/observacionesoil/observacionesoil.component';
import { ObservacionesfilterComponent } from './observacionesoil/observacionesfilter/observacionesfilter.component';
import { ObservacionesinsumosComponent } from './observacionesoil/observacionesinsumos/observacionesinsumos.component';
import { ObservacionesoilusComponent } from './observacionesoil/observacionesoilus/observacionesoilus.component';
import { ObservacionesfilterusComponent } from './observacionesoil/observacionesfilterus/observacionesfilterus.component';
import { ObservacionesinsumosusComponent } from './observacionesoil/observacionesinsumosus/observacionesinsumosus.component';
import { SearchDashboardComponent } from './search-dashboard/search-dashboard.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { FechasBLEditComponent } from './fechas-bl-edit/fechas-bl-edit.component';
import { DashboardbodblComponent } from './bodegaimport/dashboardbodbl/dashboardbodbl.component';
import { UsariosbiComponent } from './bodegaimport/usariosbi/usariosbi.component';
import { ConteoComponent } from './bodegaimport/conteo/conteo.component';
import { RevisionblComponent } from './bodegaimport/revisionbl/revisionbl.component';
import { ReportesComponent } from './bodegaimport/reportes/reportes.component';
import { OtgarantiaComponent } from './laboratorioar/otgarantia/otgarantia.component';
import { RevisionComponent } from './bodegaimport/revision/revision.component';
import { PedidopdiComponent } from './pedidopdius/pedidopdi/pedidopdi.component';
import { PedidopdibodComponent } from './pedidopdibod/pedidopdibod/pedidopdibod.component';
import { PedidopdicreateComponent } from './pedidopdius/pedidopdicreate/pedidopdicreate.component';
import { PedidopdiexcelComponent } from './pedidopdius/pedidopdiexcel/pedidopdiexcel.component';
import { ObservacionpdiComponent } from './observacionespdi/observacionpdi/observacionpdi.component';
import { DashboardtaskComponent } from './taskflow/dashboardtask/dashboardtask.component';
import { PedidotallerComponent } from './taller/pedidotaller/pedidotaller.component';
import { CreatepedidoComponent } from './taller/createpedido/createpedido.component';
import { CreatepedidoexcelComponent } from './taller/createpedidoexcel/createpedidoexcel.component';
import { BlvhcrComponent } from './importacionesdep/blvhcr/blvhcr.component';
import { BlvhcrupdateComponent } from './importacionesdep/blvhcrupdate/blvhcrupdate.component';
import { BlvhcrdetailComponent } from './importacionesdep/blvhcrdetail/blvhcrdetail.component';
import { InvoiceproComponent } from './cotizacionprov/invoicepro/invoicepro.component';
import { BlproComponent } from './cotizacionprov/blpro/blpro.component';
import { BlprocreateComponent } from './cotizacionprov/blprocreate/blprocreate.component';
import { BlprocreateexcelComponent } from './cotizacionprov/blprocreateexcel/blprocreateexcel.component';
import { BlprodetailComponent } from './cotizacionprov/blprodetail/blprodetail.component';
import { BlvhcrinvoiceComponent } from './importacionesdep/blvhcrinvoice/blvhcrinvoice.component';
import { DashboardrevComponent } from './invoice/dashboardrev/dashboardrev.component';
import { ArchivosblComponent } from './cotizacionprov/archivosbl/archivosbl.component';
import { BlusComponent } from './pedidous/blus/blus.component';
import { BlpedusComponent } from './pedidous/blpedus/blpedus.component';
import { RevblupdateComponent } from './bodegaimport/revblupdate/revblupdate.component';
import { BuscarcodComponent } from './bodegaimport/buscarcod/buscarcod.component';
import { BodegaComponent } from './bodegaimport/bodega/bodega.component';
import { RecepcionComponent } from './procesos/recepcion/recepcion.component';
import { TransferenciasComponent } from './bodegaimport/transferencias/transferencias.component';
import { SoportesComponent } from './laboratorioar/soportes/soportes.component';
import { SlaboratorioComponent } from './pedidous/slaboratorio/slaboratorio.component';
import { FaltantesinComponent } from './invoice/faltantesin/faltantesin.component';
import { AgendamientosComponent } from './procesoscli/agendamientos/agendamientos.component';
import { AgendaComponent } from './procesos/agenda/agenda.component'; 
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { BitacoraComponent } from './agendas/bitacora/bitacora.component';
import { AgenciasbodComponent } from './bodegaimport/agenciasbod/agenciasbod.component';
import { AnalisisbodagComponent } from './bodegaimport/analisisbodag/analisisbodag.component';
import { FawComponent } from './bodegaimport/faw/faw.component';
import { InspeccionarrivosComponent } from './bodegaimport/inspeccionarrivos/inspeccionarrivos.component';
import { InspeccionblarrivoComponent } from './bodegaimport/inspeccionblarrivo/inspeccionblarrivo.component';
import { JacComponent } from './bodegaimport/jac/jac.component';
import { SinotrukcaComponent } from './bodegaimport/sinotrukca/sinotrukca.component';
import { RepuestoModalComponent } from './bodegaimport/repuesto-modal/repuesto-modal.component';
import { AdminsolicitudespermisoComponent } from './pedidovhcr/adminsolicitudespermiso/adminsolicitudespermiso.component';
import { VidriosCreateComponent } from './pedidovhcr/oil/vidrios-create/vidrios-create.component';
import { VidriosPedidosComponent } from './pedidovhcr/oil/vidrios-pedidos/vidrios-pedidos.component';
import { VidriosListComponent } from './pedidovhcr/oil/vidrios-list/vidrios-list.component';
import { VidriosListenvComponent } from './pedidovhcr/oil/vidrios-listenv/vidrios-listenv.component';
import { ObservacionesvidriosusComponent } from './observacionesoil/observacionesvidriosus/observacionesvidriosus.component';
import { PedidobodSearchModalComponent } from './pedidovhcr/pedidobod-search-modal/pedidobod-search-modal.component';
import { RevisionrepuestosComponent } from './bodegaimport/revisionrepuestos/revisionrepuestos.component';
import { CompraslocalesComponent } from './compras/compraslocales/compraslocales.component';
import { OtgrtComponent } from './garantias/otgrt/otgrt.component';
import { OtgrtresumenComponent } from './garantias/otgrtresumen/otgrtresumen.component';
import { AsignadacotComponent } from './cotizacion/asignadacot/asignadacot.component';
import { ConsolidarCotizacionComponent } from './cotizacion/consolidar-cotizacion/consolidar-cotizacion.component';
import { CrearMultipleComponent } from './cotizacion/crear-multiple/crear-multiple.component';
import { ExceldetalleMultipleComponent } from './cotizacion/exceldetalle-multiple/exceldetalle-multiple.component';
import { RespuestacotComponent } from './cotizacion/respuestacot/respuestacot.component';
import { CotasignadaComponent } from './cotizacionprov/cotasignada/cotasignada.component';
import { CrearinvoiproComponent } from './cotizacionprov/crearinvoipro/crearinvoipro.component';
import { InvoproasignadaComponent } from './cotizacionprov/invoproasignada/invoproasignada.component';
import { AsignacionvehiComponent } from './laboratorioar/asignacionvehi/asignacionvehi.component';
import { ExtraccionbodComponent } from './laboratorioar/extraccionbod/extraccionbod.component';
import { ExtraccionvehiComponent } from './laboratorioar/extraccionvehi/extraccionvehi.component';
import { RepotenciacionCajasComponent } from './laboratorioar/repotenciacion-cajas/repotenciacion-cajas.component';
import { CabinalabComponent } from './laboratoriovhcr/cabinalab/cabinalab.component';
import { CajalabComponent } from './laboratoriovhcr/cajalab/cajalab.component';
import { CajaslabComponent } from './laboratoriovhcr/cajaslab/cajaslab.component';
import { MotorlabComponent } from './laboratoriovhcr/motorlab/motorlab.component';
import { InventariopaqComponent } from './pedidosvhcr/inventariopaq/inventariopaq.component';
import { PaqtanaComponent } from './pedidosvhcr/paqtana/paqtana.component';
import { VentaspaqComponent } from './pedidosvhcr/ventaspaq/ventaspaq.component';
import { VidriosuspedComponent } from './pedidous/vidrios/vidriosusped/vidriosusped.component';
import { VidrioslistComponent } from './pedidous/vidrios/vidrioslist/vidrioslist.component';
import { ClocalComponent } from './pedidovhcr/clocal/clocal.component';
import { EquivalentesComponent } from './repuestos/equivalentes/equivalentes.component';
import { MedidasComponent } from './repuestos/medidas/medidas.component';
import { InvoicevehiComponent } from './vehiculos/invoicevehi/invoicevehi.component';
import { BlvehiComponent } from './vehiculos/blvehi/blvehi.component';
import { InvconteoComponent } from './inventarios/invconteo/invconteo.component';
import { InvbodageComponent } from './inventarios/invbodage/invbodage.component';
import { ReservadosComponent } from './inventarios/reservados/reservados.component';
import { RankingComponent } from './inventarios/ranking/ranking.component';
import { ConteoallagenComponent } from './inventarios/conteoallagen/conteoallagen.component';
import { ReconteoComponent } from './inventarios/reconteo/reconteo.component';
import { Conteo2Component } from './inventarios/conteo2/conteo2.component';
import { AlldaysComponent } from './inventarios/alldays/alldays.component';
import { ConteoallComponent } from './inventarios/conteoall/conteoall.component';
import { ConteoglobalComponent } from './inventarios/conteoglobal/conteoglobal.component';
import { OtgrtresumComponent } from './inventarios/otgrtresum/otgrtresum.component';
import { AccesoinvComponent } from './inventarios/accesoinv/accesoinv.component';
import { Alldays1Component } from './inventarios/alldays1/alldays1.component';
import { Alldays2Component } from './inventarios/alldays2/alldays2.component';
import { ChecklistEnsamblajeComponent } from './vehiculos/checklist-ensamblaje/checklist-ensamblaje.component';
import { RecepcionplantaensamComponent } from './vehiculos/recepcionplantaensam/recepcionplantaensam.component';
import { BlvehiRevisionComponent } from './vehiculos/blvehi-revision/blvehi-revision.component';
import { ChecklistPdiComponent } from './vehiculos/checklist-pdi/checklist-pdi.component';
import { ChecklistTareaItemComponent } from './vehiculos/checklist-tarea-item/checklist-tarea-item.component';
import { ChecklistGrupoComponent } from './vehiculos/checklist-grupo/checklist-grupo.component';
import { ChecklistTareasPageComponent } from './vehiculos/checklist-tareas-page/checklist-tareas-page.component';
import { RepotenciacionagComponent } from './pedidous/repotenciacionag/repotenciacionag.component';
import { DashboardvehiComponent } from './vehiculos/dashboardvehi/dashboardvehi.component';
import { InvdashboardComponent } from './inventarios/invdashboard/invdashboard.component';
import { InicioDashboardComponent } from './inventarios/inicio-dashboard/inicio-dashboard.component';
import { InvusuariosComponent } from './inventarios/invusuarios/invusuarios.component';
import { RouterModule } from '@angular/router';
import { SincronizacionComponent } from './inventarios/sincronizacion/sincronizacion.component';
import { ReportevehiculosComponent } from './laboratorioar/reportevehiculos/reportevehiculos.component';
import { InvoicePaqtanaComponent } from './invoice/invoice-paqtana/invoice-paqtana.component';
import { Alldays3Component } from './inventarios/alldays3/alldays3.component';
import { ClasificacionComponent } from './abastecimiento/clasificacion/clasificacion.component';
import { ForecastComponent } from './abastecimiento/forecast/forecast.component';
import { RotacionComponent } from './abastecimiento/rotacion/rotacion.component';
import { TransitoComponent } from './abastecimiento/transito/transito.component';
import { OtgrtfactComponent } from './garantias/otgrtfact/otgrtfact.component';
import { OtgrtfactdetalleComponent } from './garantias/otgrtfactdetalle/otgrtfactdetalle.component';
import { OtgrtskusComponent } from './garantias/otgrtskus/otgrtskus.component';
import { ConjuntosarmadosComponent } from './bodegaimport/conjuntosarmados/conjuntosarmados.component';
import { PedidobodunifComponent } from './pedidovhcr/pedidobodunif/pedidobodunif.component';
import { GarantiasTecnicoComponent } from './garantiasvhcr/garantias-tecnico/garantias-tecnico.component';
import { GarantiasJefeComponent } from './garantiasvhcr/garantias-jefe/garantias-jefe.component';
import { GarantiasEncargadoComponent } from './garantiasvhcr/garantias-encargado/garantias-encargado.component';
import { AgenciasvhcrComponent } from './garantiasvhcr/agenciasvhcr/agenciasvhcr.component';
import { RepuestosDanadosComponent } from './pedidous/repuestos-danados/repuestos-danados.component';
import { RepuestosdnadosclaseComponent } from './pedidovhcr/repuestosdnadosclase/repuestosdnadosclase.component';
import { EcommerceComponent } from './pedidous/ecommerce/ecommerce.component';
import { CrearOrdenCompletaComponent } from './invoice/crear-orden-completa/crear-orden-completa.component';
import { BldetalleComponent } from './bl/bldetalle/bldetalle.component';
import { OtautComponent } from './garantias/otaut/otaut.component';
import { OtautdetalleComponent } from './garantias/otautdetalle/otautdetalle.component';
import { MaestropartesComponent } from './abastecimiento/maestropartes/maestropartes.component';
import { HistorialbajasComponent } from './invoice/historialbajas/historialbajas.component';
import { ExtraccionImagenesComponent } from './laboratorioar/extraccion-imagenes/extraccion-imagenes.component';
import { TransitovehiComponent } from './vehiculos/transitovehi/transitovehi.component';
import { CampanasComponent } from './inventarios/campanas/campanas.component';
import { InvusuarioComponent } from './inventarios/invusuario/invusuario.component';
 
 
export function initializeApp(appInitializer: AppInitializerService) {
  return () => appInitializer.init();
}

registerLocaleData(localeEs);


@NgModule({
  declarations: [
    AppComponent,
    AddTutorialComponent,
    TutorialDetailsComponent,
    TutorialsListComponent,    
    ListaproveedorComponent,
    ListaproductoComponent,
    ListapedidoComponent,
    AddPedidoComponent,
    AddProductoComponent,
    AddProveedorComponent ,
    ProductoDetailsComponent,
    PedidoDetailsComponent,
    ProveedorDetailsComponent,
    ListacategoriaComponent,
    AddCategoriaComponent,
    CategoriaDetailsComponent,
    ListaimportacionesComponent,
    AddImportacionComponent,
    ImportacionDetailsComponent,
    DashboardComponent,
    ImportDetailComponent,
    LoginComponent,
    DocumentoUploadComponent,
    NavigationComponent,
    ImportEditComponent,
    FechasOrdenEditComponent,
    LiquidadoComponent,
    ProcesoComponent,
    DetalleordenComponent,
    PedidobodComponent,
    ModalImageComponent,
    PedidobodrevComponent,
    PedidoboderrorComponent,
    AccessDeniedComponent,
    LaboratorioComponent,
    LaboratoriorevComponent,
    LaboratoriovehisComponent,
    PedidosbodComponent,
    PedidosbodrevComponent,
    PedidosboderrorComponent,
    PedidoIndividualComponent,   
    PedidoExcelComponent,
        SugeridosComponent,
        SugeridosrevComponent,
        SugeridoserrorComponent,
        CrearsugeridoComponent,
        SugeridoexcelComponent,
        SugeridosadComponent,
        SugeridosadrevComponent,
        SugeridosaderrorComponent,
        CrearComponent,
        DetalleComponent,
        ExceldetalleComponent,
        DashboardcotComponent,
        InvoicecrearComponent,
        InvoicedetalleComponent,
        InvoicexcelComponent,
        DashboardinvoiComponent,
        LaboratoriovehidetailComponent,
        AprobadasComponent,
        RechazadasComponent,
        DetallescotComponent,
        DashboardcotproComponent,
        RespuestaproComponent,
        ObservacionesComponent,
        RevisioncotComponent,
        CreateInvoiceComponent,
        DashboardinvoiceComponent,
        ObservacionespedComponent,
        DashboardbodimpComponent,
        PedidobodproComponent,
        PedidobodasigComponent,
        BodegaimporenvComponent,
        DashboardlabComponent,
        SugelabcrearComponent,
        SugelabexcelComponent,
        PedidosbodasigComponent,
        PedidosbodproceComponent,
        SugeridoslabrevComponent,
        DashboardblComponent,
        BlCreateComponent,
        BlInvoiceComponent,
        BlInvoiceexcelComponent,
        BlInvoicebldetailComponent,
        OilListComponent,
        OilCreateComponent,
        OilEditComponent,
        OilPedidosComponent,
        OiluslistComponent,
        OiluspedComponent,
        FilterCreateComponent,
        InsumoCreateComponent,
        FilteruspedComponent,
        FilteruslistComponent,
        InsumouslistComponent,
        InsumouspedComponent,
        FilterListComponent,
        InsumoListComponent,
        DashboardprovpedComponent,
        OilListenvComponent,
        FilterListenvComponent,
        InsumoListenvComponent,
        ObservacionesoilComponent,
        ObservacionesfilterComponent,
        ObservacionesinsumosComponent,
        ObservacionesoilusComponent,
        ObservacionesfilterusComponent,
        ObservacionesinsumosusComponent,
        SearchDashboardComponent,
       FechasBLEditComponent,
       DashboardbodblComponent,
       UsariosbiComponent,
       ConteoComponent,
       RevisionblComponent,
       ReportesComponent,
       OtgarantiaComponent,
       RevisionComponent,
       PedidopdiComponent,
       PedidopdibodComponent,
       PedidopdicreateComponent,
       PedidopdiexcelComponent,
       ObservacionpdiComponent,
       DashboardtaskComponent,
       PedidotallerComponent,
       CreatepedidoComponent,
       CreatepedidoexcelComponent,
       BlvhcrComponent,
       BlvhcrupdateComponent,
       BlvhcrdetailComponent,
       InvoiceproComponent,
       BlproComponent,
       BlprocreateComponent,
       BlprocreateexcelComponent,
       BlprodetailComponent,
       BlvhcrinvoiceComponent,
       DashboardrevComponent,
       ArchivosblComponent,
       BlusComponent,
       BlpedusComponent,
       RevblupdateComponent,
       BuscarcodComponent,
       BodegaComponent,
       RecepcionComponent,
       TransferenciasComponent,
       SoportesComponent,
       SlaboratorioComponent,
       FaltantesinComponent,
       AgendamientosComponent,
       AgendaComponent,
       AdminDashboardComponent,
       BitacoraComponent,
       AgenciasbodComponent,
       AnalisisbodagComponent,
       FawComponent,
       InspeccionarrivosComponent,
       InspeccionblarrivoComponent,
       JacComponent,
       SinotrukcaComponent,
       RepuestoModalComponent,
       AdminsolicitudespermisoComponent,
       VidriosCreateComponent,
       VidriosPedidosComponent,
       VidriosListComponent,
       VidriosListenvComponent,
       ObservacionesvidriosusComponent,
       PedidobodSearchModalComponent,
       RevisionrepuestosComponent,
       CompraslocalesComponent,
       OtgrtComponent,
       OtgrtresumenComponent,
       AsignadacotComponent,
       ConsolidarCotizacionComponent,
       CrearMultipleComponent,
       ExceldetalleMultipleComponent,
       RespuestacotComponent,
       CotasignadaComponent,
       CrearinvoiproComponent,
       InvoproasignadaComponent,
       AsignacionvehiComponent,
       ExtraccionbodComponent,
       ExtraccionvehiComponent,
       RepotenciacionCajasComponent,
       CabinalabComponent,
       CajalabComponent,
       CajaslabComponent,
       MotorlabComponent,
       InventariopaqComponent,
       PaqtanaComponent,
       VentaspaqComponent,
       VidriosuspedComponent,
       VidrioslistComponent,
       ClocalComponent,
       EquivalentesComponent,
       MedidasComponent,
       InvoicevehiComponent,
       BlvehiComponent,
       InvconteoComponent,
       InvbodageComponent,
       ReservadosComponent,
       RankingComponent,
       ConteoallagenComponent,
       ReconteoComponent,
       Conteo2Component,
       AlldaysComponent,
       ConteoallComponent,
       ConteoglobalComponent,
       OtgrtresumComponent,
       AccesoinvComponent,
       Alldays1Component,
       Alldays2Component,
       ChecklistEnsamblajeComponent,
       RecepcionplantaensamComponent,
       BlvehiRevisionComponent,
       ChecklistPdiComponent,
       ChecklistTareaItemComponent,
       ChecklistGrupoComponent,
       ChecklistTareasPageComponent,
       RepotenciacionagComponent,
       DashboardvehiComponent,
       InvdashboardComponent,
       InicioDashboardComponent,
       InvusuariosComponent,
       SincronizacionComponent,
       ReportevehiculosComponent,
       InvoicePaqtanaComponent,
       Alldays3Component,
       ClasificacionComponent,
       ForecastComponent,
       RotacionComponent,
       TransitoComponent,
       OtgrtfactComponent,
       OtgrtfactdetalleComponent,
       OtgrtskusComponent,
       ConjuntosarmadosComponent,
       PedidobodunifComponent,
       GarantiasTecnicoComponent,
       GarantiasJefeComponent,
       GarantiasEncargadoComponent,
       AgenciasvhcrComponent,
       RepuestosDanadosComponent,
       RepuestosdnadosclaseComponent,
       EcommerceComponent,
       CrearOrdenCompletaComponent,
       BldetalleComponent,
       OtautComponent,
       OtautdetalleComponent,
       MaestropartesComponent,
       HistorialbajasComponent,
       ExtraccionImagenesComponent,
       TransitovehiComponent,
       CampanasComponent,
       InvusuarioComponent
         
  ],
  imports: [
    BrowserModule,
    CommonModule, 
    AppRoutingModule,
     NgxPaginationModule ,
    
    BrowserAnimationsModule,
 CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    HttpClientModule,
    FormsModule,        // For template-driven forms
    ReactiveFormsModule,
    FontAwesomeModule,
   
  ],
  schemas: [
    // Option 2: Use this if app-tutorial-details is a Web Component
    CUSTOM_ELEMENTS_SCHEMA,
    
    // Option 3: Use this to suppress all template errors (use with caution)
    // NO_ERRORS_SCHEMA
  ],
  providers: [
    // Proveedor para el inicializador de la aplicación
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitializerService],
      multi: true
    },
    // Proveedor para el interceptor de autenticación
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
