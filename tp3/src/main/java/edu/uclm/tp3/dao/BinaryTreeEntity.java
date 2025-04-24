package edu.uclm.tp3.dao;

import javax.persistence.*;

@Entity
@Table(name = "binary_trees")
public class BinaryTreeEntity {

    @Id
    @Column(name = "qubits")
    private Integer qubits;

    /** 
     * Ahora este campo es el BLOB con los bytes GZIP del árbol. 
     */
    @Lob
    @Column(name = "tree_data", columnDefinition = "LONGBLOB")
    private byte[] treeData;

    // getters y setters
    public Integer getQubits() { return qubits; }
    public void setQubits(Integer qubits) { this.qubits = qubits; }

    public byte[] getTreeData() { return treeData; }
    public void setTreeData(byte[] treeData) { this.treeData = treeData; }
}
