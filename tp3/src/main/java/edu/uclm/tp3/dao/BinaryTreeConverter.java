package edu.uclm.tp3.dao;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.GRCircuit;

import java.io.*;

@Converter(autoApply = false)
public class BinaryTreeConverter implements AttributeConverter<BinaryTree, byte[]> {

    @Override
    public byte[] convertToDatabaseColumn(BinaryTree tree) {
        if (tree == null) {
            return null;
        }
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ObjectOutputStream oos   = new ObjectOutputStream(bos)) {
            oos.writeObject(tree);
            oos.flush();
            return bos.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Error serializando BinaryTree", e);
        }
    }

    @Override
    public BinaryTree convertToEntityAttribute(byte[] dbData) {
        if (dbData == null || dbData.length == 0) {
            return null;
        }
        try (ByteArrayInputStream bis = new ByteArrayInputStream(dbData);
             ObjectInputStream ois    = new ObjectInputStream(bis)) {
            BinaryTree tree = (BinaryTree) ois.readObject();
            // Re‑inicializar campos transient
            tree.setCircuit(new GRCircuit());
            // El campo qubits NO es transient, así que se conserva.
            // Si necesitas reinyectar coder via Spring, hazlo en servicio.
            return tree;
        } catch (IOException | ClassNotFoundException e) {
            throw new IllegalStateException("Error deserializando BinaryTree", e);
        }
    }
}
