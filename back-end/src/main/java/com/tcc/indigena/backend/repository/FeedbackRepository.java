package com.tcc.indigena.backend.repository;

import com.tcc.indigena.backend.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // Não precisa escrever nada aqui! O Spring cria os códigos de salvar sozinho.
}