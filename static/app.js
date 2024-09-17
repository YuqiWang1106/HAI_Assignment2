// ！！！！！！！需要修改图片地址到/static起头的地址！！！！！！不然没法deploy


document.addEventListener("DOMContentLoaded", function() {
    // new WOW().init();
    const inputField = document.getElementById("user-input");

    // 监听输入框的键盘按下事件
    inputField.addEventListener('keydown', function(event) {
        // 检查按下的是否是回车键（Enter）
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止默认的换行行为
            sendMessage(); // 调用发送消息的函数
        }
    });

    // 为文件上传区域添加点击时间
    document.getElementById('file-dropzone').addEventListener('click', function() {
        document.getElementById('file-input').click();
    });
  });


  // 允许拖放（允许拖放遮盖）
function allowDrag(event) {
    event.preventDefault(); //阻止浏览器的默认行为（浏览器默认会阻止该元素接受任何拖动行）
}


// 处理文件拖放
function handleFileDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const latestFile = files[files.length - 1];  // 获取最新最近的一次文件拖放上传
        handleFile(latestFile);  // 拖放后调用方法处理文件
    }  
}

// 处理文件选择（鼠标点击）
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const latestFile = files[files.length - 1];  //获取最新最近的一次文件拖放上传
        handleFile(latestFile);  // 文件选择后调用方法处理文件
    }
}


// 全局变量
let parsedData = [];

// 处理CSV文件上传和错误提示
function handleFile(file) {


    if (file && file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const csvData = event.target.result;
            // 将CSV文件转换为JavaScript的对象数组（d3)
            parsedData = d3.csvParse(csvData, d3.autoType);
            // 只展示前10行
            const previewData = parsedData.slice(0, 10);
            // 显示表格预览，传递JavaScript数组参数
            displayTablePreview(previewData);

            document.getElementById('toggle-button').style.display = 'block';
        };
        reader.readAsText(file);
    } else {
        // 文件上传错误提示
        alert("Only CSV files are allowed.");
    }
}



// 显示表格预览
function displayTablePreview(data) {
    const tableContainer = document.getElementById('table-preview');
    tableContainer.innerHTML = ''; // 每调用一次，清空之前的表格

    // 创建表格
    const table = document.createElement('table');
    table.className = 'table table-striped';

    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 创建表格内容
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    tableContainer.appendChild(table);
    // 设置容器为可见
    tableContainer.style.display = 'block';
}


// 按钮隐藏或显示表格预览
function toggleTablePreview() {
    const tableContainer = document.getElementById('table-preview');
    const toggleButton = document.getElementById('toggle-button');
    if (tableContainer.style.display === 'none') {
        tableContainer.style.display = 'block';
        toggleButton.textContent = 'Hide Table Preview';
    } else {
        tableContainer.style.display = 'none';
        toggleButton.textContent = 'Show Table Preview';
    }
}


// 通过d3自动检测数据类型
function detectDataTypes(data) {
    const dataTypes = {};
    const sampleRow = data[0];

    Object.keys(sampleRow).forEach(column => {
        const value = sampleRow[column];
        if (typeof value === 'number') {
            dataTypes[column] = 'quantitative';  // 数值型
        } else if (Object.prototype.toString.call(value) === '[object Date]') {
            dataTypes[column] = 'temporal';      // 时间型
        } else {
            dataTypes[column] = 'nominal';       // 分类型/字符串型
        }
    });

    return dataTypes;
}



// 构造 prompt，包括列名、数据类型和示例数据
function constructPromptForVegaLite(data, userQuery) {
    const columns = Object.keys(data[0]);       // 获取列名
    const sampleValues = data.slice(0, 20);      // 提取前3行作为示例
    const dataTypes = detectDataTypes(data);    // 检测数据类型

    let dataTypeDescriptions = '';
    Object.keys(dataTypes).forEach(column => {
        dataTypeDescriptions += `${column} is of type ${dataTypes[column]}. `;
    });

    const prompt = `
    Based on a dataset with columns: ${columns.join(', ')}, where ${dataTypeDescriptions}, and sample values: ${JSON.stringify(sampleValues)}.

    Please generate a Vega-Lite JSON specification for a chart that fulfills the following request:
    "${userQuery}".

    If user's message/query/questions is not related to the dataset analysis(e.g., greetings, personal questions, or comments like "Hello", "Bye", "Love the movie", "How are you?", "Tell me a joke", “yes/no", "good/bad" etc.), you must retrun an empty vega-lite JSON object {}!
    
    If you cannot generate a valid Vega-Lite JSON specification based on the request and the provided data, you also must return an empty JSON object {}!


    Do not include the data values directly in the "data" field of the specification.
    Instead, use "data": {"values": "myData"}, assuming that "myData" will be provided during rendering.

    When using aggregate functions like "count", do not include parentheses or use them as field names. Use "aggregate": "count" and do not specify a "field" unless counting a specific field.

    Ensure that the chart uses appropriate visual encoding based on the data types and includes any necessary data transformations.

    If you cannot generate a valid Vega-Lite JSON specification based on the request and the provided data or if the user's query is not relevant to the dataset, you must return an empty JSON object {}!
    
    When writing expressions (e.g., in "transform" filters), if a field name contains spaces or special characters, reference it using bracket notation. For example, use datum['Release Year'] instead of datum.Release Year.
    
    The generated JSON should include the "$schema": "https://vega.github.io/schema/vega-lite/v5.json" field.

    Return only the JSON object without any additional text or explanation.**
    
    Do not include any descriptions, comments, or explanations outside of the JSON object.

    Also, ensure no unnecessary fields are included and the chart is syntactically correct.
    `;

    return prompt;
}


// 构造用于生成图表说明的 prompt
function constructPromptForDescription(data, userQuery) {
    const sampleValues = data.slice(0, 30);  // 提取前5行作为示例

    const prompt = `
    Based on the sample data: ${JSON.stringify(sampleValues)},
    and the user's request: "${userQuery}",
    please provide a brief description of the chart that was generated based on this request.

    The description should be similar to: "This chart visualizes the relationship between weight and miles per gallon (MPG) of different car models, with points colored by the number of cylinders.".

    Please return only the description without any additional text.
    `;

    return prompt;
}



function sendMessage() {
  const inputField = document.getElementById("user-input");
  const chatContainer = document.getElementById("chat-container");
  const userMessage = inputField.value;



  if (userMessage) {

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('user-message');
    userMessageDiv.innerHTML = `
      <div class='userName'>
        You
      </div>
      <div class='user-flex-container'>
        <div class='user-flex-container messageContainer'>
          <div class='messageText'>
            ${userMessage}
          </div>
        </div>
        <div class='imageContainer'>
          <img src="/static/user_avator.png" alt="userImage"> 
        </div>                     
      </div>
    `;
    // 将用户消息添加到聊天容器中
    chatContainer.appendChild(userMessageDiv);

    userMessageDiv.scrollIntoView({ behavior: 'smooth' });

    if (parsedData && parsedData.length > 0){
    // 构造 prompt，包括数据集信息和用户输入的请求
    const prompt = constructPromptForVegaLite(parsedData, userMessage);

    // Send it to the server
    fetch("https://hai-assignment2.onrender.com/generate_chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.vegaLiteSpec && Object.keys(data.vegaLiteSpec).length > 0) {
            // 创建唯一的图表容器 ID
            const uniqueChartId = `vega-chart-container-${Date.now()}`;
  
            // 创建 AI 消息的 div
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.classList.add('ai-message');
            aiMessageDiv.innerHTML = `
              <div class='aiName'>
                Robot
              </div>


              <div class='ai-flex-container'>

                <div class='aiImageContainer'>
                  <img src="/static/ai_avator.png" alt="aiImage">  
                </div>    


                <div class='ai-flex-container aiMessageContainer'>
                    <div id="${uniqueChartId}" class="image_generate" style="width:auto; height: auto;"></div>  <!-- 放置图表的容器 -->
                    <div class='messageText' id="description-${uniqueChartId}">     
                </div>          
                  
              </div>
            `;
            // 将 AI 消息添加到聊天容器中
            chatContainer.appendChild(aiMessageDiv);

            aiMessageDiv.scrollIntoView({ behavior: 'smooth' });
  
            // // 渲染 Vega-Lite 图表
            // renderVegaLiteChart(data.vegaLiteSpec, uniqueChartId);

            // const descriptionPrompt = constructPromptForDescription(parsedData, userMessage);

            // // 发送到服务器，获取图表说明
            // fetch("http://localhost:8000/generate_description", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ prompt: descriptionPrompt }),
            // })
            //   .then((response) => response.json())
            //   .then((descData) => {
            //     // 更新图表说明
            //     const descriptionDiv = document.getElementById(`description-${uniqueChartId}`);
            //     descriptionDiv.textContent = descData.description;
            //   })
            //   .catch((error) => {
            //     console.error("Error:", error);
            //     const descriptionDiv = document.getElementById(`description-${uniqueChartId}`);
            //     descriptionDiv.textContent = "Failed to generate description.";
            //   });
            // 渲染 Vega-Lite 图表
            renderVegaLiteChart(data.vegaLiteSpec, uniqueChartId).then((renderSuccess) => {
                if (renderSuccess) {
                    // 图表渲染成功，继续请求图表说明
                    const descriptionPrompt = constructPromptForDescription(parsedData, userMessage);

                    // 发送到服务器，获取图表说明
                    fetch("https://hai-assignment2.onrender.com/generate_description", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt: descriptionPrompt }),
                    })
                    .then((response) => response.json())
                    .then((descData) => {
                        // 更新图表说明
                        const descriptionDiv = document.getElementById(`description-${uniqueChartId}`);
                        descriptionDiv.textContent = descData.description;
                    })
                    .catch((error) => {
                        console.error("Error:", error);
                        const descriptionDiv = document.getElementById(`description-${uniqueChartId}`);
                        descriptionDiv.textContent = "Failed to generate description.";
                    });
                } else {
                    // 图表渲染失败，显示错误消息，不请求图表说明
                    const descriptionDiv = document.getElementById(`description-${uniqueChartId}`);
                    descriptionDiv.textContent = "VegaLite解析错误，请尝试重新提问。";
                }
            }); 
                  
          } else{
            // 未收到 vegaLiteSpec，显示错误消息
            // alert('No Vega-Lite specification received.');
            // AI 返回了空的 Vega-Lite 规范，显示无法回答的消息
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.classList.add('ai-message');
            aiMessageDiv.innerHTML =  `
                <div class='aiName'>
                Robot
                </div>
                <div class='ai-flex-container'>
                <div class='aiImageContainer'>
                    <img src="/static/ai_avator.png" alt="aiImage">  
                </div>
                <div class='ai-flex-container aiMessageContainer'>
                    <div class='messageText'>
                    不好意思，我无法回答这个问题。
                    </div>          
                </div>
                </div>
            `;
            chatContainer.appendChild(aiMessageDiv);
            aiMessageDiv.scrollIntoView({ behavior: 'smooth' });
          }
        //  滚动
        chatContainer.scrollTop = chatContainer.scrollHeight;
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred while processing your request. Please try again.");
    });
   } else{
    // 数据集未上传，AI 回复提示信息
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('ai-message');
    aiMessageDiv.innerHTML =  `
        <div class='aiName'>
            Robot
        </div>
        <div class='ai-flex-container'>
            <div class='aiImageContainer'>
                <img src="/static/ai_avator.png" alt="aiImage">  
            </div>
            <div class='ai-flex-container aiMessageContainer'>
                <div class='messageText'>
                    请上传数据集
                </div>          
            </div>
        </div> `;

    chatContainer.appendChild(aiMessageDiv);

    // 滚动到聊天底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
   }

    inputField.value = ""; // clear the input value
  }
}


// 渲染Vega-Lite图表的函数
function renderVegaLiteChart(spec, chartId) {
    if (spec.data && spec.data.values === 'myData') {
        // 将完整的数据集注入到规范中
        spec.data.values = parsedData;
    } else {
        // 如果规范中没有正确引用数据，手动设置
        spec.data = { values: parsedData };
    }

    // 输出生成的规范以供调试
    console.log('Generated Vega-Lite Spec:', spec);



    // 返回 Promise，以便在调用时处理成功或失败的情况
    return vegaEmbed(`#${chartId}`, spec)
    .then((result) => {
        console.log('Chart rendered successfully');
        return true; // 渲染成功，返回 true
    })
    .catch((error) => {
        console.error('Error rendering chart:', error);
        const chartContainer = document.getElementById(chartId);
        // chartContainer.innerHTML = 'Failed to render chart.';
        if (chartContainer) {
            chartContainer.parentNode.removeChild(chartContainer);
        }
        return false; // 渲染失败，返回 false
    });
}




