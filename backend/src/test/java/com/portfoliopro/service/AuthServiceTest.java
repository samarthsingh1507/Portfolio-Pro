package com.portfoliopro.service;

import com.portfoliopro.dto.ApiResponse;
import com.portfoliopro.dto.LoginRequest;
import com.portfoliopro.dto.LoginResponse;
import com.portfoliopro.dto.RegisterRequest;
import com.portfoliopro.entity.User;
import com.portfoliopro.exception.BadRequestException;
import com.portfoliopro.repository.UserRepository;
import com.portfoliopro.security.CustomUserDetailsService;
import com.portfoliopro.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest("testuser", "test@example.com", "password123");
        loginRequest = new LoginRequest("testuser", "password123");
    }

    @Test
    void testRegisterSuccess() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashedPassword");

        ApiResponse response = authService.register(registerRequest);

        assertTrue(response.isSuccess());
        assertEquals("User registered successfully", response.getMessage());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testRegisterDuplicateUsername() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(registerRequest));
        assertEquals("Username is already taken", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterDuplicateEmail() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.register(registerRequest));
        assertEquals("Email is already registered", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testLoginSuccess() {
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "testuser", "hashedPassword", Collections.emptyList()
        );

        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        when(jwtService.generateToken(userDetails)).thenReturn("mock.jwt.token");

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertEquals("testuser", response.getUsername());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void testLoginInvalidCredentials() {
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> authService.login(loginRequest));
        assertEquals("Invalid username or password", ex.getMessage());
    }
}
