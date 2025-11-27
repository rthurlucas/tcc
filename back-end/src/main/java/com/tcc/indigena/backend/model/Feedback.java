package com.tcc.indigena.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private int rating;
    private String message;

    // Construtor vazio (obrigatório para o JPA)
    public Feedback() {}

    public Feedback(String name, int rating, String message) {
        this.name = name;
        this.rating = rating;
        this.message = message;
    }

    // Getters e Setters (para o Java conseguir ler/escrever)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}