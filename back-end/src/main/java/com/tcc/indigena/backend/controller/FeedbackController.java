package com.tcc.indigena.backend.controller;

import com.tcc.indigena.backend.model.Feedback;
import com.tcc.indigena.backend.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*") // Libera o acesso para o seu site
public class FeedbackController {

    @Autowired
    private FeedbackRepository repository;

    @PostMapping
    public Feedback salvar(@RequestBody Feedback feedback) {
        return repository.save(feedback);
    }

    @GetMapping
    public List<Feedback> listar() {
        return repository.findAll();
    }
}