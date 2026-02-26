package edu.uclm.tp3.common.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class IntArrayConverter implements AttributeConverter<int[], String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(int[] attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Error al convertir int[] a JSON", e);
        }
    }

    @Override
    public int[] convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new int[0];
        }
        try {
            return objectMapper.readValue(dbData, int[].class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Error al convertir JSON a int[]", e);
        }
    }
}
