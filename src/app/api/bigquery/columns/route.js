// // app/api/bigquery/columns/route.js

// import bigquery from '@/lib/bigquery';

// export async function GET(req) {
//   try {
//     // Obtener los parámetros de la URL (projectId, datasetId y tableName)
//     const url = new URL(req.url);
//     const projectId = 'peak-emitter-350713'; // Project ID fijo
//     const datasetId = 'FR_RetFid_output';  // Dataset ID fijo
//     const tableName = url.searchParams.get('database');  // Obtenemos el nombre de la tabla desde los parámetros

//     if (!tableName) {
//       return new Response(
//         JSON.stringify({
//           message: '❌ Faltó el nombre de la tabla (tableName)',
//         }),
//         {
//           status: 400,
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         }
//       );
//     }

//     // Obtener las tablas disponibles en el dataset para debuggear
//     const [tables] = await bigquery.dataset(datasetId).getTables();
//     const tableNames = tables.map((table) => table.id);  // Obtener los nombres de las tablas
//     console.log(`📊 Dataset: ${datasetId}`);
//     console.log(`🔍 Tablas disponibles en el dataset "${datasetId}":`, tableNames);

//     // Verificar si la tabla seleccionada existe
//     if (!tableNames.includes(tableName)) {
//       return new Response(
//         JSON.stringify({
//           message: `❌ La tabla "${tableName}" no existe en el dataset "${datasetId}"`,
//         }),
//         {
//           status: 404,
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         }
//       );
//     }

//     // Obtener las columnas de la tabla seleccionada
//     const [table] = await bigquery.dataset(datasetId).table(tableName).getMetadata();
//     console.log(`🔍 Obteniendo columnas de la tabla "${tableName}"...`);

//     // Verificamos si la propiedad `schema` existe y contiene `fields`
//     if (!table || !table.schema || !Array.isArray(table.schema.fields)) {
//       return new Response(
//         JSON.stringify({
//           message: `❌ No se pudo obtener el esquema de la tabla "${tableName}". La propiedad 'schema.fields' no está definida.`,
//         }),
//         {
//           status: 500,
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         }
//       );
//     }

//     // Ahora accedemos a `table.schema.fields`, que es un arreglo con la información de las columnas
//     const columnAttributes = table.schema.fields.map((field) => ({
//       name: field.name,   // Nombre de la columna
//       type: field.type,   // Tipo de la columna (STRING, INTEGER, etc.)
//       mode: field.mode,   // Modo de la columna (NULLABLE, REQUIRED, REPEATED)
//     }));

//     console.log(`🔍 Atributos de la tabla "${tableName}":`, columnAttributes);

//     return new Response(
//       JSON.stringify({
//         message: '✅ Atributos obtenidos correctamente',
//         columns: columnAttributes,  // Retornamos los atributos de las columnas
//         availableTables: tableNames,  // Retornamos las tablas disponibles para debuggear
//       }),
//       {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );
//   } catch (error) {
//     console.error('❌ Error al obtener las columnas:', error.message);

//     return new Response(
//       JSON.stringify({
//         message: '❌ Error al obtener las columnas',
//         error: error.message,
//       }),
//       {
//         status: 500,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       }
//     );
//   }
// }


// app/api/bigquery/columns/route.js
import bigquery from '@/lib/bigquery';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const projectId = 'peak-emitter-350713';
    const datasetId = 'FR_Reingresos_output';
    const tableName = url.searchParams.get('table'); // ✅ DINÁMICO
    const columnsParam = url.searchParams.get('columns'); // Para obtener valores únicos

    if (!tableName) {
      return new Response(JSON.stringify({ 
        message: '❌ Se requiere el parámetro "table"',
        example: '/api/bigquery/columns?table=BD_ENVIOS_SAYA_20251103'
      }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    // Verificar que la tabla existe
    const [tables] = await bigquery.dataset(datasetId).getTables();
    const tableNames = tables.map(t => t.id);
    if (!tableNames.includes(tableName)) {
      return new Response(JSON.stringify({ 
        message: `❌ La tabla "${tableName}" no existe`,
        availableTables: tableNames
      }), { status: 404, headers: { 'Content-Type': 'application/json' }});
    }

    // Obtener esquema de la tabla
    const [table] = await bigquery.dataset(datasetId).table(tableName).getMetadata();
    if (!table?.schema?.fields) {
      return new Response(JSON.stringify({ 
        message: `❌ No se pudo obtener esquema de "${tableName}"` 
      }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }

    const columnAttributes = table.schema.fields.map(f => ({ 
      name: f.name, 
      type: f.type, 
      mode: f.mode 
    }));

    // Si se solicitan valores únicos de columnas específicas
    let uniqueValues = {};
    if (columnsParam) {
      const columns = columnsParam.split(',').map(c => c.trim());
      console.log(`🔍 Buscando valores únicos para columnas: ${columns.join(', ')}`);
      console.log(`📋 Columnas disponibles en tabla: ${columnAttributes.map(c => c.name).join(', ')}`);
      
      for (const col of columns) {
        const columnExists = columnAttributes.find(c => c.name === col);
        if (columnExists) {
          try {
            const query = `
              SELECT DISTINCT ${col} as value 
              FROM \`${projectId}.${datasetId}.${tableName}\`
              WHERE ${col} IS NOT NULL 
              ORDER BY value 
              LIMIT 1000
            `;
            
            console.log(`📊 Ejecutando query para ${col}:`, query);
            const [rows] = await bigquery.query(query);
            uniqueValues[col] = rows.map(row => row.value);
            console.log(`✅ ${col}: ${uniqueValues[col].length} valores únicos encontrados`);
          } catch (err) {
            console.error(`❌ Error obteniendo valores de ${col}:`, err.message);
            uniqueValues[col] = [];
          }
        } else {
          console.log(`⚠️ Columna "${col}" no existe en la tabla`);
          uniqueValues[col] = [];
        }
      }
    }

    console.log(`✅ Columnas obtenidas de ${tableName}:`, columnAttributes.length);
    if (Object.keys(uniqueValues).length > 0) {
      console.log('✅ Valores únicos obtenidos:', Object.keys(uniqueValues));
    }

    return new Response(JSON.stringify({
      message: '✅ Datos obtenidos correctamente',
      table: tableName,
      columns: columnAttributes,
      uniqueValues: uniqueValues,
      availableTables: tableNames
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (error) {
    console.error('❌ Error en /api/bigquery/columns:', error);
    return new Response(JSON.stringify({ 
      message: '❌ Error al obtener datos de columnas', 
      error: error.message 
    }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
