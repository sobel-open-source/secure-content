package com.sobel.filestorage.endpoint.dto;


import lombok.Data;

@Data
public class EncryptionRequest {

    private String aesKeyEncrypted;
    private String iv;
    private String encryptedData;
    private String algorithm;
}
