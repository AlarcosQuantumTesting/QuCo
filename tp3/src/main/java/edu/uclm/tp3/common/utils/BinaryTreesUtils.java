package edu.uclm.tp3.common.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.List;
import java.util.Optional;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import edu.uclm.tp3.common.deterministic.BinaryTree;
import edu.uclm.tp3.common.deterministic.GRCircuit;
import edu.uclm.tp3.common.deterministic.Pair;
import edu.uclm.tp3.dao.BinaryTreeDao;
import edu.uclm.tp3.dao.BinaryTreeEntity;
import jakarta.transaction.Transactional;

public class BinaryTreesUtils {

	public static BinaryTree buildTree(BinaryTreeDao btDao, int qubits, List<Pair> pairs, String prefix, boolean originalGR, double physicalAngle) {
		BinaryTree tree = findTree(btDao, qubits);
		for (int i=0; i<pairs.size(); i++) {
			Pair pair = pairs.get(i);
			int index = pair.getIndex();
			String binary = String.format("%" + qubits + "s", Integer.toBinaryString(index)).replace(' ', '0');
			int freq = pair.getFreq();
			tree.setFrequencies(binary, freq);
		}
		
		if (prefix.length()>0)
			tree.setPrefixes("", prefix);

		tree.normalizeProbabilities();		
		tree.getCircuit().setQubits(qubits);
        if (!originalGR && physicalAngle>0) {
			double minProb = Math.cos(physicalAngle/2 + Math.PI/4);
			minProb = minProb * minProb;
			tree.removeLowAngles(physicalAngle);
		}
		return tree;
	}

    @Transactional
    public static BinaryTree findTree(BinaryTreeDao btDao, int qubits) {
        // 1) Intentamos cargar
        Optional<BinaryTreeEntity> optEntity = btDao.findById(qubits);
        if (optEntity.isPresent()) {
            try {
                // Descompress & deserialize
                BinaryTree tree = decompress(optEntity.get().getTreeData());
				tree.setCircuit(new GRCircuit());
                return tree;
            } catch (IOException | ClassNotFoundException e) {
                //throw new IllegalStateException("Error al descomprimir BinaryTree para " + qubits, e);
            }
        }

        // 2) No existe → creamos
        BinaryTree tree = new BinaryTree();
        tree.setQubits(qubits);
        for (int j = 0; j < qubits-1; j++)
            tree.addChildren();

        try {
            byte[] compressed = compress(tree);
            BinaryTreeEntity entity = new BinaryTreeEntity();
            entity.setQubits(qubits);
            entity.setTreeData(compressed);
            btDao.save(entity);
        } catch (IOException e) {
            throw new IllegalStateException("Error al comprimir BinaryTree para " + qubits, e);
        }

        return tree;
    }

	private static BinaryTree decompress(byte[] data) throws IOException, ClassNotFoundException {
        try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
             GZIPInputStream gis        = new GZIPInputStream(bis);
             ObjectInputStream ois      = new ObjectInputStream(gis)) {
            return (BinaryTree) ois.readObject();
        }
    }	

    private static byte[] compress(Serializable obj) throws IOException {
		try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
			GZIPOutputStream gos        = new GZIPOutputStream(bos);
			ObjectOutputStream oos      = new ObjectOutputStream(gos)) {
			oos.writeObject(obj);
			oos.flush();
			gos.finish();  // cierra el flujo GZIP correctamente
			return bos.toByteArray();
		}
	}
}
