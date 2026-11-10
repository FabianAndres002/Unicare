package it.unicare.accesso;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/** Un familiare o una badante. Corrisponde alla tabella "utente" (migrazione V1). */
@Entity
@Table(name = "utente")
public class Utente {

    public enum Tipo { FAMILIARE, BADANTE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String cognome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo;

    @Column(name = "creato_il", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime creatoIl;

    /** Costruttore vuoto richiesto da JPA. */
    protected Utente() {
    }

    public Utente(String email, String passwordHash, String nome, String cognome, Tipo tipo) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nome = nome;
        this.cognome = cognome;
        this.tipo = tipo;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getNome() { return nome; }
    public String getCognome() { return cognome; }
    public Tipo getTipo() { return tipo; }
}
