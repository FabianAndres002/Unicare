package it.unicare.accesso;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;

/**
 * L'utente come lo vede Spring Security dopo il login.
 * Viene salvato nella sessione, per questo è Serializable e contiene solo dati semplici.
 */
public record UtenteConnesso(Long id, String email, String passwordHash, String nome, Utente.Tipo tipo)
        implements UserDetails, Serializable {

    static UtenteConnesso da(Utente u) {
        return new UtenteConnesso(u.getId(), u.getEmail(), u.getPasswordHash(), u.getNome(), u.getTipo());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + tipo.name()));
    }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public String getUsername() { return email; }
}
