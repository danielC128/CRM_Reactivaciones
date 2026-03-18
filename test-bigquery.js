// Script para probar la conexión a BigQuery
import { BigQuery } from '@google-cloud/bigquery';
import 'dotenv/config';

async function testBigQueryConnection() {
  console.log('🔍 Probando conexión a BigQuery...\n');

  // Verificar que existe la variable de entorno
  if (!process.env.BIG_QUERY_KEY) {
    console.error('❌ No se encontró BIG_QUERY_KEY en las variables de entorno');
    return;
  }

  try {
    // Parsear las credenciales
    const credentials = JSON.parse(process.env.BIG_QUERY_KEY);
    console.log('✅ Credenciales parseadas correctamente');
    console.log('📧 Service Account:', credentials.client_email);
    console.log('🆔 Project ID:', credentials.project_id);
    console.log('');

    // Crear cliente de BigQuery
    const bigquery = new BigQuery({
      projectId: credentials.project_id,
      credentials: credentials,
    });

    console.log('🔄 Intentando listar tablas del dataset...\n');

    const projectId = 'peak-emitter-350713';
    const datasetId = 'FR_Reingresos_output';

    // Intentar obtener las tablas
    const [tables] = await bigquery.dataset(datasetId).getTables();

    console.log(`✅ Conexión exitosa! Se encontraron ${tables.length} tablas:`);
    tables.forEach(table => {
      console.log(`   - ${table.id}`);
    });

  } catch (error) {
    console.error('❌ Error al conectar a BigQuery:\n');
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);

    if (error.code) {
      console.error('Código:', error.code);
    }

    // Sugerencias según el tipo de error
    if (error.message.includes('Invalid JWT Signature')) {
      console.error('\n💡 Sugerencia: La firma JWT es inválida. Esto significa que:');
      console.error('   1. La private_key no es válida o está mal formateada');
      console.error('   2. Las credenciales fueron revocadas');
      console.error('   3. El service account fue eliminado o modificado');
      console.error('\n   Solución: Genera nuevas credenciales en Google Cloud Console');
    } else if (error.message.includes('Permission denied')) {
      console.error('\n💡 Sugerencia: El service account no tiene permisos suficientes.');
      console.error('   Roles necesarios:');
      console.error('   - BigQuery Data Viewer (bigquery.dataViewer)');
      console.error('   - O BigQuery User (bigquery.user)');
    }
  }
}

testBigQueryConnection();
