package it.unicare.accesso;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Regole di sicurezza:
 * - /api/auth/registrati, /api/auth/login e /api/stato sono aperti a tutti;
 * - ogni altro /api/** richiede il login;
 * - i file del frontend sono pubblici.
 * La protezione CSRF usa il cookie XSRF-TOKEN che il frontend rimanda nell'header X-XSRF-TOKEN.
 */
@Configuration
public class SicurezzaConfig {

    @Bean
    SecurityFilterChain regole(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/registrati", "/api/auth/login", "/api/stato").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .csrf(csrf -> csrf.spa())
            // Niente pagina di login di Spring: il login lo fa il nostro endpoint JSON.
            .formLogin(f -> f.disable())
            .httpBasic(b -> b.disable())
            .logout(l -> l.disable())
            // Se manca il login risponde 401 in JSON, non con un redirect.
            .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                res.setStatus(HttpStatus.UNAUTHORIZED.value());
                res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                res.setCharacterEncoding("UTF-8");
                res.getWriter().write(
                    "{\"codice\":\"NON_AUTENTICATO\",\"messaggio\":\"Devi accedere per continuare.\"}");
            }));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AccessoService accesso, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(accesso);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }
}
