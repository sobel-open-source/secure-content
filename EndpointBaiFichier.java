package com.sobel.filestorage.endpoint;

import com.sobel.filestorage.endpoint.dto.ChiffrementRequest;
import com.sobel.filestorage.endpoint.dto.EncryptionRequest;
import com.sobel.filestorage.endpoint.dto.ProcessResult;
import com.sobel.filestorage.service.RSAKeyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.*;
import javax.crypto.spec.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;


//💡 Analogie simple :
//Texte classique = Écrire sur du papier → Tout le monde peut lire
//WebGL sécurisé = Écrire sur du sable → Photo du sable → Effacer le sable → Brûler la photo
//L'utilisateur voit le texte à l'écran, mais :
//
//Le "sable" (canvas temporaire) est effacé
//La "photo" (texture) est brûlée
//Seul l'affichage final reste (irrécupérable)
//
//Résultat : L'œil humain voit le texte, mais aucun outil informatique ne peut le récupérer ! 🎯



@RestController()
@RequestMapping("/api/fichier-bai")

public class EndpointBaiFichier {


    @Autowired
    private  RSAKeyService rsaKeyService;


    @GetMapping(value = "/texte", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> readStaticBaiFile() {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("WEB-INF/fichier-bai.txt")) {
            if (is == null) {
                return ResponseEntity.notFound().build();
            }

            // readAllBytes conserve les sauts de ligne d'origine (\n ou \r\n selon le fichier)
            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok(content);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la lecture du fichier BAI : " + e.getMessage());
        }
    }

    private static final String AES_ALGORITHM = "AES/GCM/NoPadding";
    private static final String RSA_ALGORITHM = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";

    @PostMapping("/chiffrer")
    public ResponseEntity<String> processEncryptedData(
            @RequestBody EncryptionRequest request) {

        try {
            // 1. Vérification des paramètres
            if (!"AES-GCM-RSA-OAEP".equals(request.getAlgorithm())) {
                return ResponseEntity.badRequest().body("Algorithme non supporté");
            }

            // 2. Déchiffrement de la clé AES
            byte[] decryptedAesKey = decryptRsaKey(request.getAesKeyEncrypted());
            SecretKey aesKey = new SecretKeySpec(decryptedAesKey, "AES");

            // 3. Préparation de l'IV
            byte[] iv = Base64.getDecoder().decode(request.getIv());
            if (iv.length != 12) {
                return ResponseEntity.badRequest().body("IV doit faire 12 bytes");
            }

//            // 4. Déchiffrement des données (exemple)
//            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
//            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(128, iv));
//
//            byte[] decryptedData = cipher.doFinal(
//                    Base64.getDecoder().decode(request.getEncryptedData())
//            );

                        // 2. Lire le fichier texte (statique ou défini par request.source)
            InputStream is = getClass().getClassLoader().getResourceAsStream("WEB-INF/fichier-bai.txt");
            if (is == null) return ResponseEntity.notFound().build();
            byte[] fileBytes = is.readAllBytes();

            // 3. Chiffrer avec AES (mode CBC + IV)
           // Cipher aesCipher = Cipher.getInstance("AES/CBC/PKCS5Padding");

//            SecureRandom random = new SecureRandom();
//            random.nextBytes(iv);
//            IvParameterSpec ivSpec = new IvParameterSpec(iv);
//            aesCipher.init(Cipher.ENCRYPT_MODE, aesKey, ivSpec);
//            byte[] encryptedData = aesCipher.doFinal(fileBytes);
            // 5. Traitement métier (exemple)
          //  String processedData = processBusinessLogic(new String(decryptedData, "UTF-8"));

            // 6. Réponse chiffrée (optionnelle)
            byte[] responseData = encryptResponse(aesKey, fileBytes);

            return ResponseEntity.ok(Base64.getEncoder().encodeToString(responseData));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur de traitement: " + e.getMessage());
        }
    }

    private byte[] decryptRsaKey(String encryptedKeyBase64) throws Exception {
        Cipher cipher = Cipher.getInstance(RSA_ALGORITHM);
        OAEPParameterSpec oaepParams = new OAEPParameterSpec(
                "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT
        );
        cipher.init(Cipher.DECRYPT_MODE, rsaKeyService.getKeyPair().getPrivate(), oaepParams);
        return cipher.doFinal(Base64.getDecoder().decode(encryptedKeyBase64));
    }

    private byte[] encryptResponse(SecretKey aesKey, byte[] date) throws Exception {
        byte[] iv = new byte[12]; // Nouvel IV pour la réponse
        new SecureRandom().nextBytes(iv);

        Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(128, iv));

        byte[] encrypted = cipher.doFinal(date);

        // Concaténer IV + données chiffrées
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        outputStream.write(iv);
        outputStream.write(encrypted);

        return outputStream.toByteArray();
    }



//    @PostMapping(value = "/chiffrer", produces = MediaType.TEXT_PLAIN_VALUE)
//    public ResponseEntity<String> chiffrerAvecAES(@RequestBody ChiffrementRequest request) throws InvalidKeyException, NoSuchPaddingException, NoSuchAlgorithmException {
//
//        try {
//
//            String encryptedKeyBase64 = request.getAesKeyEncrypted();
//            byte[] encryptedKey = Base64.getDecoder().decode(encryptedKeyBase64);
//
//            // 2. Configurer le déchiffrement RSA
//            Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
//            PrivateKey privateKey = rsaKeyService.getKeyPair().getPrivate();
//
//            // 3. Initialiser avec les mêmes paramètres que le front
//            OAEPParameterSpec oaepParams = new OAEPParameterSpec(
//                    "SHA-256",
//                    "MGF1",
//                    MGF1ParameterSpec.SHA256,
//                    PSource.PSpecified.DEFAULT
//            );
//
//            cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams);
//
//            // 4. Déchiffrer
//            byte[] decryptedKey = cipher.doFinal(encryptedKey);
//
//            SecretKey aesKey = new SecretKeySpec(decryptedKey, "AES");
//
//            // 2. Lire le fichier texte (statique ou défini par request.source)
//            InputStream is = getClass().getClassLoader().getResourceAsStream("WEB-INF/fichier-bai.txt");
//            if (is == null) return ResponseEntity.notFound().build();
//            byte[] fileBytes = is.readAllBytes();
//
//            // 3. Chiffrer avec AES (mode CBC + IV)
//            Cipher aesCipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
//            byte[] iv = new byte[16];
//            SecureRandom random = new SecureRandom();
//            random.nextBytes(iv);
//            IvParameterSpec ivSpec = new IvParameterSpec(iv);
//            aesCipher.init(Cipher.ENCRYPT_MODE, aesKey, ivSpec);
//            byte[] encryptedData = aesCipher.doFinal(fileBytes);
//
//            // 4. Préfixer IV aux données et encoder
//            ByteArrayOutputStream out = new ByteArrayOutputStream();
//            out.write(iv);
//            out.write(encryptedData);
//            String base64Final = Base64.getEncoder().encodeToString(out.toByteArray());
//
//            return ResponseEntity.ok(base64Final);
//
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body("Erreur : " + e.getMessage());
//        }
//    }

    @GetMapping("/public-key")
    public String getPublicKey() {
        try {
            PublicKey publicKey = rsaKeyService.getKeyPair().getPublic();
            byte[] encoded = publicKey.getEncoded();
            return "-----BEGIN PUBLIC KEY-----\n" +
                    Base64.getMimeEncoder().encodeToString(encoded) +
                    "\n-----END PUBLIC KEY-----";
        } catch (Exception e) {
            throw new RuntimeException("Failed to get public key", e);
        }
    }
}
