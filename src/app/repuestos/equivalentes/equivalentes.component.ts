import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { EquivalentesService, Equivalente, EquivalenteInsert } from '../../services/equivalentes.service';
import { OracleService } from 'src/app/services/oracle.service';

@Component({
  selector: 'app-equivalentes',
  templateUrl: './equivalentes.component.html',
  styleUrls: ['./equivalentes.component.css']
})
export class EquivalentesComponent implements OnInit {
  equivalentes: Equivalente[] = [];
  filteredData: Equivalente[] = [];
  paginatedData: Equivalente[] = [];

  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 0;

  isModalOpen = false;
  isEditing = false;
  saving = false;
  modalError = '';

  /* NUEVAS PROPIEDADES */
  isSearchModalOpen = false;
  searchResults: Equivalente[] = [];
  searchUniqueCodes: { code: string; desc: string }[] = [];

  form: FormGroup;

  
/* NUEVA: solo las descripciones únicas que coinciden con el código buscado */
searchDescriptions: string[] = [];
/* NUEVA: solo los códigos equivalentes únicos (sin el original) */
searchEquivCodes: string[] = [];
stockMap: { [codigo: string]: number } = {}; // true = tiene stock
stockBuscado: number = 0;
agenciasMap: { [codigo: string]: { oficina: string; stock: number }[] } = {};
agenciasBuscado: { oficina: string; stock: number }[] = [];


  constructor(private fb: FormBuilder, private service: EquivalentesService, private oracleService: OracleService) {
    this.form = this.fb.group({
      id: [null],
      codsistema:  ['', [Validators.required, Validators.maxLength(30)]],
      codoriginal: ['', [Validators.maxLength(50)]],
      chino:       ['', [Validators.maxLength(50)]],
      descripcion: ['', Validators.maxLength(250)],
      codigo1:     ['', Validators.maxLength(50)],
      codigo2:     ['', Validators.maxLength(50)],
      codigo3:     ['', Validators.maxLength(50)],
      codigo4:     ['', Validators.maxLength(50)],
      codigo5:     ['', Validators.maxLength(50)]
    });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.service.getAll().subscribe(data => {
      this.equivalentes = data;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredData = this.equivalentes.filter(eq => {
      if (!term) return true;
      return (
        eq.codsistema.toLowerCase().includes(term)  ||
        eq.codoriginal.toLowerCase().includes(term) ||
        eq.chino.toLowerCase().includes(term)       ||
        (eq.descripcion && eq.descripcion.toLowerCase().includes(term)) ||
        (eq.codigo1 && eq.codigo1.toLowerCase().includes(term)) ||
        (eq.codigo2 && eq.codigo2.toLowerCase().includes(term)) ||
        (eq.codigo3 && eq.codigo3.toLowerCase().includes(term)) ||
        (eq.codigo4 && eq.codigo4.toLowerCase().includes(term)) ||
        (eq.codigo5 && eq.codigo5.toLowerCase().includes(term))
      );
    });
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagination();
  }

private async verificarStockAsync(codigos: string[]): Promise<{ [key: string]: number }> {
  const checks = codigos
    .filter(c => !!c)
    .map(code =>
      this.oracleService
        .getStockDisponible(code.trim())
        .toPromise()
        .then(qty => ({ [code.trim()]: qty ?? 0 }))
    );

  return Promise.all(checks).then(results =>
    results.reduce((acc, curr) => ({ ...acc, ...curr }), {} as { [key: string]: number })
  );
}

private async verificarStockConAgenciasAsync(codigos: string[]): Promise<void> {
  const checks = codigos.map(code =>
    this.oracleService
      .getStockConAgencias(code.trim())
      .toPromise()
      .then(res => ({ code: code.trim(), ...res }))
  );

  const results = await Promise.all(checks);

  results.forEach(r => {
    this.stockMap[r.code] = r.total ?? 0;
this.agenciasMap[r.code] = r.agencias ?? [];
  });
}


  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  

  private buildUniqueCodes(): void {
    const seen = new Set<string>();
    const list: { code: string; desc: string }[] = [];

    this.searchResults.forEach(eq => {
      // código original
      const keyO = eq.codoriginal.trim().toUpperCase();
      if (!seen.has(keyO)) {
        seen.add(keyO);
        list.push({ code: eq.codoriginal, desc: eq.descripcion || 'Sin descripción' });
      }
      // códigos equivalentes
      [eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
        .forEach(c => {
          if (c) {
            const key = c.trim().toUpperCase();
            if (!seen.has(key)) {
              seen.add(key);
              list.push({ code: c, desc: eq.descripcion || 'Sin descripción' });
            }
          }
        });
    });
    this.searchUniqueCodes = list;
  }

/* ========== 1. TRAER TODOS los registros que contengan el código ========== */
private findAllMatches(code: string): Equivalente[] {
  if (!code) return [];
  const term = code.trim().toUpperCase();

  const all = this.equivalentes.filter(eq =>
    eq.codsistema.trim().toUpperCase() === term ||
    eq.codoriginal.trim().toUpperCase() === term ||
    [eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5]
      .some(c => c && c.trim().toUpperCase() === term)
  );

  const map = new Map<number, Equivalente>();
  all.forEach((r:any) => map.set(r.id, r));
  return Array.from(map.values());
}

/* ========== 2. Por cada código equivalente de esos registros, traer sus registros y unir todo ========== */
private async buildEquivList(): Promise<void> {
  const seenDesc = new Set<string>();
  const equivSet = new Set<string>();
  const term = this.searchTerm.trim().toUpperCase();

  this.searchResults = this.findAllMatches(this.searchTerm);

  const codesToSearch = new Set<string>();
  this.searchResults.forEach(eq => {
    if (eq.descripcion) seenDesc.add(eq.descripcion);
    const fields = [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5];
    fields.forEach(c => {
      if (c && c.trim().toUpperCase() !== term) {
        codesToSearch.add(c.trim());
      }
    });
  });

  codesToSearch.forEach(code => {
    const more = this.findAllMatches(code);
    more.forEach(eq => {
      if (eq.descripcion) seenDesc.add(eq.descripcion);
      const fields = [eq.codsistema, eq.codoriginal, eq.codigo1, eq.codigo2, eq.codigo3, eq.codigo4, eq.codigo5];
      fields.forEach(c => {
        if (c && c.trim().toUpperCase() !== term) {
          equivSet.add(c.trim());
        }
      });
    });
  });

  this.searchDescriptions = Array.from(seenDesc);
  const equivCodes = Array.from(equivSet);

  // ✅ Consultar stock para cada código equivalente
  await this.verificarStockConAgenciasAsync(equivCodes);
  this.searchEquivCodes = equivCodes;
}
async openSearchModal(): Promise<void> {
  this.searchResults = this.findAllMatches(this.searchTerm);
  await this.buildEquivList(); // 👈 ahora con await
   const res = await this.oracleService
                  .getStockConAgencias(this.searchTerm.trim())
                  .toPromise();
this.stockBuscado   = res?.total ?? 0;
this.agenciasBuscado = res?.agencias ?? [];
  this.isSearchModalOpen = true;
}

closeSearchModal(): void {
  this.isSearchModalOpen = false;
  this.searchDescriptions = [];
  this.searchEquivCodes = [];
}

 
  /* FIN NUEVOS MÉTODOS */

  openModal(editing = false, item?: Equivalente): void {
    this.isEditing = editing;
    this.isModalOpen = true;
    this.modalError = '';
    if (editing && item) {
      this.form.patchValue({
        id: item.id,
        codsistema: item.codsistema || '',
        codoriginal: item.codoriginal || '',
        chino: item.chino || '',
        descripcion: item.descripcion || '',
        codigo1: item.codigo1 || '',
        codigo2: item.codigo2 || '',
        codigo3: item.codigo3 || '',
        codigo4: item.codigo4 || '',
        codigo5: item.codigo5 || ''
      });
    } else {
      this.form.reset({
        id: null,
        codsistema: '',
        codoriginal: '',
        chino: '',
        descripcion: '',
        codigo1: '',
        codigo2: '',
        codigo3: '',
        codigo4: '',
        codigo5: ''
      });
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalError = '';
    this.form.reset();
  }

  private alreadyExistsInTable(): boolean {
    const raw = this.form.value;
    const dupSistOrig = this.filteredData.some(
      r =>
        r.codsistema.toLowerCase() === raw.codsistema.trim().toLowerCase() &&
        r.codoriginal.toLowerCase() === raw.codoriginal.trim().toLowerCase()
    );
    if (dupSistOrig) return true;

    const newCodes = [
      raw.codigo1?.trim(),
      raw.codigo2?.trim(),
      raw.codigo3?.trim(),
      raw.codigo4?.trim(),
      raw.codigo5?.trim()
    ].filter(Boolean);

    if (!newCodes.length) return false;

    for (const row of this.filteredData) {
      const existing = [
        row.codoriginal,
        row.codigo1,
        row.codigo2,
        row.codigo3,
        row.codigo4,
        row.codigo5
      ].map(c => c?.trim()).filter(Boolean);

      for (const code of newCodes) {
        if (existing.includes(code)) return true;
      }
    }
    return false;
  }

  save(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }
    if (this.saving) return;

    if (this.alreadyExistsInTable()) {
      this.modalError = '⚠️ Ya existe ese código (sistema+original o algún equivalente) en la tabla actual.';
      return;
    }

    this.saving = true;
    this.modalError = '';

    const raw = this.form.value;
    const payload: EquivalenteInsert = {
      codsistema:  raw.codsistema.trim(),
      codoriginal: raw.codoriginal.trim(),
      chino:       raw.chino.trim(),
      descripcion: raw.descripcion?.trim() || '',
      codigo1:     raw.codigo1?.trim() || '',
      codigo2:     raw.codigo2?.trim() || '',
      codigo3:     raw.codigo3?.trim() || '',
      codigo4:     raw.codigo4?.trim() || '',
      codigo5:     raw.codigo5?.trim() || ''
    };

    const request$ = this.isEditing
      ? this.service.update(this.form.value.id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: (res) => {
        this.saving = false;
        this.closeModal();
        this.loadAll();
        alert(res.message || (this.isEditing ? '✅ Actualizado correctamente' : '✅ Creado correctamente'));
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message || err.message || 'Error desconocido';
        if (err.status === 409) {
          this.modalError = `⚠️ ${msg}`;
        } else {
          this.modalError = `❌ ${msg}`;
        }
      }
    });
  }

  deleteItem(id: any): void {
    if (confirm('¿Estás seguro de eliminar este equivalente?')) {
      this.service.delete(id).subscribe(() => this.loadAll());
      this.clearAllFilters();
      this.loadAll();
    }
  }

  downloadExcel(): void {
    const ws = XLSX.utils.json_to_sheet(this.filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equivalentes');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([blob]), 'equivalentes.xlsx');
  }

  downloadCSV(): void {
    const headers = ['ID', 'Sistema', 'Original', 'Chino', 'Descripción', 'Cod1', 'Cod2', 'Cod3', 'Cod4', 'Cod5'];
    const rows = this.filteredData.map(e => [
      e.id, e.codsistema, e.codoriginal, e.chino, e.descripcion,
      e.codigo1, e.codigo2, e.codigo3, e.codigo4, e.codigo5
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'equivalentes.csv');
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  isCargaModalOpen = false;
  uploadMessage = '';
  uploadLoading = false;

  openCargaModal(): void {
    this.isCargaModalOpen = true;
    this.uploadMessage = '';
  }

  closeCargaModal(): void {
    this.isCargaModalOpen = false;
    this.uploadMessage = '';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    const valid = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!valid.includes(file.type)) {
      this.uploadMessage = '❌ Solo se permiten archivos Excel (.xlsx o .xls)';
      return;
    }
    this.uploadFile(file);
  }

  uploadFile(file: File): void {
    this.uploadLoading = true;
    this.uploadMessage = '';
    this.service.cargaMasiva(file).subscribe({
      next: res => {
        this.uploadMessage = `✅ ${res.message}`;
        this.uploadLoading = false;
        this.loadAll();
      },
      error: err => {
        this.uploadLoading = false;
        const msg = err.error?.message || err.message || 'Error desconocido';
        this.uploadMessage = `❌ ${msg}`;
      }
    });
  }

  downloadPlantilla(): void {
    const headers = ['codoriginal', 'codsistema', 'chino', 'descripcion', 'codigo1', 'codigo2', 'codigo3', 'codigo4', 'codigo5'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    const blob = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([blob]), 'plantilla_equivalentes.xlsx');
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getVisiblePages(): number[] {
    const max = 7;
    const half = Math.floor(max / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  Math = Math;

  private markFormGroupTouched(form: FormGroup): void {
    Object.values(form.controls).forEach(c => {
      c.markAsTouched();
      if ((c as any).controls) this.markFormGroupTouched(c as any);
    });
  }
}