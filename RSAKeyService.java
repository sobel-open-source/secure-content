package com.sobel.filestorage.service;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.InputStream;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

@Component()
public class RSAKeyService {

    private final KeyPair keyPair;

    public RSAKeyService() {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048); // Taille standard
            this.keyPair = keyGen.generateKeyPair();
        } catch (Exception e) {
            throw new RuntimeException("Erreur de génération RSA", e);
        }
    }

    public KeyPair getKeyPair() {
        return keyPair;
    }
}

