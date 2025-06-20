import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';



export interface PaginatedResponse {

content: string; // Contenu chiffré en Base64

pageNumber: number; // Numéro de la page courante

totalPages: number; // Nombre total de pages

}

@Injectable({
  providedIn: 'root',
})
export class BaiFichierService  {
  private http = inject(HttpClient);

 public fichier(source: string) {
  return this.http.get(`http://localhost:5050/api/fichier-bai/${source}`, {
    responseType: 'text'
  });
}

 public fichierChiffrement(source: string, clePubliqueBase64: string) {
  return this.http.post(
    `http://localhost:5050/api/fichier-bai/${source}`,
    { publicKey: clePubliqueBase64, source },
    { responseType: 'text' }
  );
}


}
