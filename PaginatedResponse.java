package com.sobel.filestorage.endpoint.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedResponse {
    private String content;              // Contenu chiffré en Base64
    private int pageNumber;              // Numéro de la page courante (0-indexed)
    private int pageSize;                // Taille de la page
    private int totalPages;                // Taille de la totalPages


}